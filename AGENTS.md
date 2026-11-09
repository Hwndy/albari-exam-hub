# Project implementation rules

- Keep the default password consistent between the student-creation screens and the `create-student` Edge Function; the server enforces it because client values are not trusted.
- Generate student login emails consistently from normalized full names on screen and in `create-student`; the server owns the final email and adds a numeric suffix for duplicates.