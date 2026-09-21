import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeeOverview } from './FeeOverview';
import { FeeRules } from './FeeRules';
import { BillingRun } from './BillingRun';
import { InvoicesList } from './InvoicesList';
import { StudentBalances } from './StudentBalances';
import { InstallmentPlans } from './InstallmentPlans';
import { PaymentsList } from './PaymentsList';
import { RemindersPanel } from './RemindersPanel';
import { FeeReceiptGenerator } from '@/components/admin/FeeReceiptGenerator';
import { Reconciliation } from './Reconciliation';

const FEE_TABS = ['overview', 'rules', 'generate', 'invoices', 'balances', 'plans', 'payments', 'receipts', 'reminders', 'reconciliation'];

export const FeesHub: React.FC<{ initialTab?: string }> = ({ initialTab = 'overview' }) => {
  const [tab, setTab] = useState(FEE_TABS.includes(initialTab) ? initialTab : 'overview');
  useEffect(() => {
    setTab(FEE_TABS.includes(initialTab) ? initialTab : 'overview');
  }, [initialTab]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Fee Rules</TabsTrigger>
          <TabsTrigger value="generate">Create Bills</TabsTrigger>
          <TabsTrigger value="invoices">Student Bills</TabsTrigger>
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="plans">Installment Plans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview"><FeeOverview /></TabsContent>
      <TabsContent value="rules"><FeeRules /></TabsContent>
      <TabsContent value="generate"><BillingRun /></TabsContent>
      <TabsContent value="invoices"><InvoicesList /></TabsContent>
      <TabsContent value="balances"><StudentBalances /></TabsContent>
      <TabsContent value="plans"><InstallmentPlans /></TabsContent>
      <TabsContent value="payments"><PaymentsList /></TabsContent>
      <TabsContent value="receipts"><FeeReceiptGenerator /></TabsContent>
      <TabsContent value="reminders"><RemindersPanel /></TabsContent>
      <TabsContent value="reconciliation"><Reconciliation /></TabsContent>
    </Tabs>
  );
};
