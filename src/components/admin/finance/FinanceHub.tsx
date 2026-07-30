import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeesHub } from '@/components/admin/fees/FeesHub';
import { ExpensesPanel } from './ExpensesPanel';
import { OtherRevenuePanel } from './OtherRevenuePanel';
import { FinanceReports } from './FinanceReports';
import { PayrollHub } from '@/components/admin/hr/PayrollHub';

const VALID = ['reports', 'fees', 'expenses', 'revenue', 'payroll'];

export const FinanceHub: React.FC<{ subtab?: string | null }> = ({ subtab }) => {
  const [tab, setTab] = useState(subtab && VALID.includes(subtab) ? subtab : 'reports');
  useEffect(() => { if (subtab && VALID.includes(subtab)) setTab(subtab); }, [subtab]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Finance</h2>
        <p className="text-muted-foreground">Fees, expenses, other revenue, payroll and profit-and-loss reporting.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="fees">Fees &amp; Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="revenue">Other Revenue</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="reports"><FinanceReports /></TabsContent>
        <TabsContent value="fees"><FeesHub /></TabsContent>
        <TabsContent value="expenses"><ExpensesPanel /></TabsContent>
        <TabsContent value="revenue"><OtherRevenuePanel /></TabsContent>
        <TabsContent value="payroll"><PayrollHub /></TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceHub;
