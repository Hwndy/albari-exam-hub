import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  GraduationCap,
  ChevronDown,
  Globe,
  CreditCard,
  Library,
  Bell,
  CreditCard as IdCard,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    value: "overview",
  },
  {
    title: "Admissions",
    icon: GraduationCap,
    value: "admissions",
    sub: [
      { title: "Applications", value: "applications" },
      { title: "Sessions", value: "sessions" },
      { title: "Payments", value: "payments" },
      { title: "Entrance Exams", value: "entrance-exams" },
      { title: "Decisions", value: "decisions" },
      { title: "Analytics", value: "analytics" },
    ],
  },
  {
    title: "Academic",
    icon: BookOpen,
    value: "academic",
    sub: [
      { title: "Exams", value: "exams" },
      { title: "Results", value: "results" },
      { title: "Questions", value: "questions" },
      { title: "Classes", value: "classes" },
      { title: "Students", value: "students" },
      { title: "Subjects", value: "subjects" },
      { title: "Timetable", value: "timetable" },
      { title: "Report Cards", value: "report-cards" },
    ],
  },
  {
    title: "Fee Management",
    icon: CreditCard,
    value: "fees",
  },
  {
    title: "Library",
    icon: Library,
    value: "library",
  },
  {
    title: "Notifications",
    icon: Bell,
    value: "notifications",
  },
  {
    title: "ID Cards",
    icon: IdCard,
    value: "id-cards",
  },
  {
    title: "Users",
    icon: Users,
    value: "users",
  },
  {
    title: "Website",
    icon: Globe,
    value: "website",
    sub: [
      { title: "News & Articles", value: "news" },
      { title: "Gallery", value: "gallery" },
      { title: "Testimonials", value: "testimonials" },
      { title: "School Info", value: "school-info" },
      { title: "Site Settings", value: "site-settings" },
    ],
  },
  {
    title: "System",
    icon: Settings,
    value: "system",
    sub: [
      { title: "Email Logs", value: "email-logs" },
      { title: "Monitor", value: "monitor-logs" },
      { title: "All Results", value: "results-modal" },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "overview";
  const currentSubTab = searchParams.get("subtab");
  
  const [openGroups, setOpenGroups] = useState<string[]>(["admissions", "academic", "website", "system"]);

  const navigate = useNavigate();

  const isActive = (value: string, subValue?: string) => {
    if (subValue) {
      return currentTab === value && currentSubTab === subValue;
    }
    return currentTab === value && !currentSubTab;
  };

  const isParentActive = (value: string) => {
    return currentTab === value;
  };

  const handleNavigation = (value: string, subValue?: string) => {
    if (subValue) {
      navigate(`/admin?tab=${value}&subtab=${subValue}`);
    } else {
      navigate(`/admin?tab=${value}`);
    }
  };

  const toggleGroup = (value: string) => {
    setOpenGroups((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  return (
    <Sidebar collapsible="icon" className={collapsed ? "w-14" : "w-64"}>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider>
                {menuItems.map((item) =>
                  item.sub ? (
                    <Collapsible
                      key={item.value}
                      open={!collapsed && openGroups.includes(item.value)}
                      onOpenChange={() => !collapsed && toggleGroup(item.value)}
                    >
                      <SidebarMenuItem>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={isParentActive(item.value) ? "bg-accent" : ""}
                              >
                                <item.icon className="h-4 w-4" />
                                {!collapsed && (
                                  <>
                                    <span>{item.title}</span>
                                    <ChevronDown
                                      className={`ml-auto h-4 w-4 transition-transform ${
                                        openGroups.includes(item.value) ? "rotate-180" : ""
                                      }`}
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right">
                              <p>{item.title}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {!collapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.sub.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.value}>
                                  <SidebarMenuSubButton
                                    onClick={() => handleNavigation(item.value, subItem.value)}
                                    className={
                                      isActive(item.value, subItem.value)
                                        ? "bg-accent font-medium"
                                        : ""
                                    }
                                  >
                                    <span>{subItem.title}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.value}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => handleNavigation(item.value)}
                            className={isActive(item.value) ? "bg-accent font-medium" : ""}
                          >
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  )
                )}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}