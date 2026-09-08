import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap, Users, Loader2, ChevronRight, AlertTriangle,
} from 'lucide-react';
import ClassRoster from './ClassRoster';
import GenderReview from './GenderReview';
import SchoolStructure from './SchoolStructure';
import StructureReports from './StructureReports';

interface LevelCard {
  id: string; name: string; level_order: number;
  total: number; male: number; female: number;
  by_campus: Record<string, number>;
}
interface Overview {
  campuses: { id: string; name: string; code: string }[];
  levels: LevelCard[];
  totals: {
    students: number; male: number; female: number; missing_gender: number;
    boarding: number; day: number; unplaced: number;
  };
}

export const StudentsHub: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [openLevel, setOpenLevel] = useState<{ id: string; name: string } | null>(null);
  const [tab, setTab] = useState('classes');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res, error } = await (supabase as any).rpc('get_students_overview');
      if (error) throw error;
      setData(res as Overview);
    } catch (e: any) {
      toast({ title: 'Could not load students', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  if (openLevel) {
    return (
      <ClassRoster
        levelId={openLevel.id}
        levelName={openLevel.name}
        onBack={() => { setOpenLevel(null); void load(); }}
      />
    );
  }

  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Students</h2>
        <p className="text-sm text-muted-foreground">
          Pick a class to open its full student list, filters and export.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="gender">
            Missing gender
            {t?.missing_gender ? <Badge variant="destructive" className="ml-2">{t.missing_gender}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="structure">Campuses &amp; classes</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4 mt-4">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Active students</p>
                  <p className="text-2xl font-bold">{t?.students ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Male / Female</p>
                  <p className="text-2xl font-bold">{t?.male ?? 0} / {t?.female ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Day / Boarding</p>
                  <p className="text-2xl font-bold">{t?.day ?? 0} / {t?.boarding ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Not placed in a class</p>
                  <p className="text-2xl font-bold">{t?.unplaced ?? 0}</p>
                </CardContent></Card>
              </div>

              {(t?.unplaced ?? 0) > 0 && (
                <Card className="border-amber-500/40">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">{t?.unplaced} students are not yet placed in a campus and class.</p>
                      <p className="text-muted-foreground">
                        Open “Campuses &amp; classes”, review the mapping of your old class names, and apply it.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setTab('structure')}>
                        Review structure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(data?.levels?.length ?? 0) === 0 ? (
                <Card><CardContent className="p-10 text-center text-muted-foreground">
                  No classes yet. Set them up under “Campuses &amp; classes”.
                </CardContent></Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data!.levels.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setOpenLevel({ id: l.id, name: l.name })}
                      className="text-left rounded-lg border bg-card hover:shadow-md transition-shadow p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          {l.name}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> {l.total} student{l.total === 1 ? '' : 's'}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(data!.campuses || []).map(c => (
                          <Badge key={c.id} variant="outline">
                            {c.name.replace(' Campus', '')}: {l.by_campus?.[c.code] ?? 0}
                          </Badge>
                        ))}
                        <Badge variant="secondary">M {l.male}</Badge>
                        <Badge variant="secondary">F {l.female}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="gender" className="mt-4"><GenderReview /></TabsContent>
        <TabsContent value="reports" className="mt-4"><StructureReports /></TabsContent>
        <TabsContent value="structure" className="mt-4"><SchoolStructure /></TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentsHub;
