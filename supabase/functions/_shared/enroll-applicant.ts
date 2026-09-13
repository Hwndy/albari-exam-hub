// Shared enrolment routine used by every acceptance-fee path (online Paystack
// verification, the Paystack webhook, and offline payments recorded by admin).
// Creates the student login, admission number, student record, class placement,
// credits the acceptance fee against school fees and emails the credentials.
// Safe to re-run: every step reuses what already exists.

export interface AcceptancePaymentInfo {
  amount: number;
  method: string;
  reference: string;
}

export interface EnrollmentResult {
  already_enrolled: boolean;
  admission_number: string | null;
  login_email: string | null;
  contact_email: string | null;
  application_number: string | null;
  student_name: string;
  temporary_password?: string | null;
}

export async function enrollApplicant(
  supabase: any,
  applicationId: string,
  payment: AcceptancePaymentInfo,
): Promise<EnrollmentResult> {
  const { data: application, error: appError } = await supabase
    .from("admission_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    throw appError ?? new Error("Application not found");
  }

  // Already enrolled? Return what exists.
  if (application.student_id || application.status === "enrolled") {
    const { data: existingStudent } = await supabase
      .from("students")
      .select("admission_number")
      .eq("id", application.student_id)
      .maybeSingle();
    console.log("Application already enrolled, skipping creation");
    return {
      already_enrolled: true,
      admission_number: existingStudent?.admission_number ?? null,
      login_email: application.login_email ?? application.email,
      contact_email: application.email,
      application_number: application.application_number,
      student_name: `${application.first_name} ${application.last_name}`,
    };
  }

  // Collision-free admission number.
  const { data: allocated, error: allocError } = await supabase.rpc("next_admission_number");
  if (allocError || !allocated) {
    console.error("Error allocating admission number:", allocError);
    throw allocError ?? new Error("Could not allocate an admission number");
  }
  const admissionNumber = String(allocated);

  // School-issued student login (families share one email, so it can never be
  // the student's login). All correspondence still goes to application.email.
  const { data: domainSetting } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "student_login_domain")
    .maybeSingle();
  const rawDomain = domainSetting?.setting_value;
  const loginDomain =
    (typeof rawDomain === "string" ? rawDomain : rawDomain?.toString?.()) ||
    "students.albari.com.ng";
  const slug = (value: string) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  const nameLocal = [slug(application.first_name), slug(application.last_name)]
    .filter(Boolean)
    .join(".");
  const admissionTail = (admissionNumber.match(/(\d+)\s*$/)?.[1] ?? "").toLowerCase();
  const localPart =
    nameLocal ||
    admissionNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let loginEmail = application.login_email || `${localPart}@${loginDomain}`;

  // Unambiguous temporary password (no 0/O/1/l/I).
  const alphabet = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (src: string, n: number) =>
    Array.from({ length: n }, () => src[Math.floor(Math.random() * src.length)]).join("");
  let password: string | null = `Alb${pick(alphabet, 5)}${pick(digits, 3)}`;

  let userId: string | null = null;
  for (let attempt = 0; attempt < 6 && !userId; attempt++) {
    const suffix =
      attempt === 0
        ? ""
        : attempt === 1 && admissionTail
          ? `.${admissionTail}`
          : `-${attempt + 1}`;
    const candidate = suffix ? loginEmail.replace("@", `${suffix}@`) : loginEmail;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: candidate,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: `${application.first_name} ${application.last_name}`,
        role: "student",
      },
    });
    if (!authError) {
      userId = authUser.user.id;
      loginEmail = candidate;
      break;
    }
    console.warn("createUser failed for", candidate, authError.message);
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find(
      (u: any) => (u.email ?? "").toLowerCase() === candidate.toLowerCase(),
    );
    let ownedByOther = false;
    if (existing && !application.login_email) {
      const { data: otherApp } = await supabase
        .from("admission_applications")
        .select("id")
        .ilike("login_email", candidate)
        .neq("id", applicationId)
        .maybeSingle();
      ownedByOther = Boolean(otherApp);
    }
    if (existing && !ownedByOther) {
      userId = existing.id;
      loginEmail = candidate;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("user_id", userId)
        .maybeSingle();
      const neverSignedIn = !existingProfile || existingProfile.must_change_password !== false;
      if (neverSignedIn) {
        const { error: pwError } = await supabase.auth.admin.updateUserById(userId, {
          password: password as string,
          email_confirm: true,
        });
        if (pwError) {
          console.error("Could not reset temporary password:", pwError.message);
          password = null;
        }
      } else {
        password = null;
        await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
      }
      break;
    }
    if (!existing) throw authError;
  }
  if (!userId) throw new Error("Could not allocate a student login ID");

  await supabase
    .from("admission_applications")
    .update({ login_email: loginEmail })
    .eq("id", applicationId);

  await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: "student", created_by: userId })
    .select()
    .maybeSingle();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      full_name: `${application.first_name} ${application.middle_name ?? ""} ${application.last_name}`
        .replace(/\s+/g, " ")
        .trim(),
      must_change_password: true,
    },
    { onConflict: "user_id" },
  );
  if (profileError) {
    console.error("Error upserting student profile:", profileError);
    throw profileError;
  }

  const { data: priorStudent } = await supabase
    .from("students")
    .select("id, admission_number")
    .eq("user_id", userId)
    .maybeSingle();

  let newStudent: { id: string; admission_number: string } | null = (priorStudent as any) ?? null;
  let currentNumber = admissionNumber;
  for (let attempt = 0; attempt < 5 && !newStudent; attempt++) {
    const { data: inserted, error: studentError } = await supabase
      .from("students")
      .insert({
        user_id: userId,
        admission_number: currentNumber,
        date_of_birth: application.date_of_birth,
        gender: application.gender,
        blood_group: application.blood_group,
        address: application.address,
        emergency_contact: application.parent_guardian_info,
        medical_info: {
          conditions: application.medical_conditions,
          allergies: application.allergies,
        },
        admission_date: new Date().toISOString().split("T")[0],
        status: "active",
        is_boarder: application.boarding_interest ?? false,
      })
      .select()
      .single();
    if (!studentError) {
      newStudent = inserted as any;
      break;
    }
    if (studentError.code !== "23505") {
      console.error("Error creating student:", studentError);
      throw studentError;
    }
    console.warn("Admission number collision on", currentNumber, "- retrying");
    const { data: retryNumber } = await supabase.rpc("next_admission_number");
    if (!retryNumber) throw studentError;
    currentNumber = String(retryNumber);
  }
  if (!newStudent) throw new Error("Could not create the student record");
  const student = newStudent as { id: string; admission_number: string };
  const finalAdmissionNumber = student.admission_number ?? currentNumber;

  if (application.gender || application.boarding_interest != null) {
    const patch: Record<string, unknown> = {};
    if (application.gender) patch.gender = application.gender;
    if (application.boarding_interest != null) {
      patch.is_boarder = application.boarding_interest;
    }
    const { error: patchError } = await supabase.from("students").update(patch).eq("id", student.id);
    if (patchError) console.error("Error updating student profile:", patchError);
  }

  // Credit the acceptance fee against school fees (guarded so it can never
  // double-credit for the same reference).
  const acceptanceAmount = Number(payment.amount ?? 0);
  if (Number.isFinite(acceptanceAmount) && acceptanceAmount > 0) {
    const { data: existingCredit } = await supabase
      .from("fee_payments")
      .select("id")
      .eq("transaction_id", payment.reference)
      .maybeSingle();
    if (existingCredit) {
      console.log("Acceptance fee already credited for", payment.reference);
    } else {
      let creditStructureId: string | null = null;
      const creditClassId = application.admitted_to_class_id ?? application.applying_for_class_id;
      if (creditClassId) {
        const { data: structure } = await supabase
          .from("fee_structures")
          .select("id")
          .eq("class_id", creditClassId)
          .eq("is_mandatory", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        creditStructureId = structure?.id ?? null;
      }
      const { error: creditError } = await supabase.from("fee_payments").insert({
        student_id: student.id,
        fee_structure_id: creditStructureId,
        amount_paid: acceptanceAmount,
        payment_method: payment.method || "paystack",
        transaction_id: payment.reference,
        payment_reference: payment.reference,
        status: "completed",
        paid_at: new Date().toISOString(),
        notes: "Acceptance fee credited towards school fees",
        metadata: { source: "acceptance_fee", application_id: applicationId },
      });
      if (creditError) {
        console.error("Error crediting acceptance fee to school fees:", creditError);
      }
    }
  }

  // Class placement (class_assignments.student_id references profiles.user_id;
  // a trigger mirrors this into student_enrollments).
  const classId = application.admitted_to_class_id ?? application.applying_for_class_id;
  if (classId) {
    const { data: existingAssignment } = await supabase
      .from("class_assignments")
      .select("id")
      .eq("student_id", userId)
      .maybeSingle();
    if (!existingAssignment) {
      const { error: assignError } = await supabase
        .from("class_assignments")
        .insert({ student_id: userId, class_id: classId });
      if (assignError) console.error("Error assigning student to class:", assignError);
    }
    if (!application.admitted_to_class_id) {
      await supabase
        .from("admission_applications")
        .update({ admitted_to_class_id: classId })
        .eq("id", applicationId);
    }
  }

  await supabase
    .from("admission_applications")
    .update({ status: "enrolled", student_id: student.id })
    .eq("id", applicationId);

  const contactEmail = String(application.email ?? "").trim().toLowerCase();

  try {
    let className: string | null = null;
    if (classId) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .maybeSingle();
      className = cls?.name ?? null;
    }
    await supabase.functions.invoke("send-admission-notification", {
      body: {
        application_id: applicationId,
        notification_type: "enrolled",
        additional_data: {
          admission_number: finalAdmissionNumber,
          login_email: loginEmail,
          contact_email: contactEmail,
          ...(password ? { temporary_password: password } : {}),
          ...(className ? { class_name: className } : {}),
        },
      },
    });
  } catch (emailError) {
    console.error("Error sending welcome email:", emailError);
  }

  console.log("Student enrolled successfully:", finalAdmissionNumber);
  return {
    already_enrolled: false,
    admission_number: finalAdmissionNumber,
    login_email: loginEmail,
    contact_email: contactEmail,
    application_number: application.application_number,
    student_name: `${application.first_name} ${application.last_name}`,
    temporary_password: password,
  };
}
