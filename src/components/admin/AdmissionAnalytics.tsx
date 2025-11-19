import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Clock, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useSchoolQuery } from '@/hooks/useSchoolQuery';

interface AnalyticsData {
  totalApplications: number;
  byStatus: { [key: string]: number };
  byGender: { male: number; female: number };
  totalRevenue: number;
  conversionRate: number;
}

export const AdmissionAnalytics = () => {
  const { withSchoolFilter } = useSchoolQuery();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalApplications: 0,
    byStatus: {},
    byGender: { male: 0, female: 0 },
    totalRevenue: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get all applications
      const { data: applications, error: appError } = await withSchoolFilter(
        supabase
          .from("admission_applications")
          .select("status, gender")
      );

      if (appError) throw appError;

      // Get payments
      const { data: payments, error: payError } = await supabase
        .from("admission_payments")
        .select("amount, status")
        .eq("status", "completed");

      if (payError) throw payError;

      // Process data
      const byStatus: { [key: string]: number } = {};
      const byGender = { male: 0, female: 0 };

      applications?.forEach((app) => {
        byStatus[app.status] = (byStatus[app.status] || 0) + 1;
        if (app.gender === "male") byGender.male++;
        else if (app.gender === "female") byGender.female++;
      });

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const enrolled = byStatus["enrolled"] || 0;
      const total = applications?.length || 1;
      const conversionRate = (enrolled / total) * 100;

      setAnalytics({
        totalApplications: total,
        byStatus,
        byGender,
        totalRevenue,
        conversionRate,
      });
    } catch (error: any) {
      console.error("Failed to load analytics:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const statusData = Object.entries(analytics.byStatus).map(([name, value]) => ({
    name: name.replace(/_/g, " ").toUpperCase(),
    value,
  }));

  const genderData = [
    { name: "Male", value: analytics.byGender.male },
    { name: "Female", value: analytics.byGender.female },
  ];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admission Analytics</h2>
        <p className="text-muted-foreground">Overview of admission performance and metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalApplications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{analytics.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.byStatus["accepted"] || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
