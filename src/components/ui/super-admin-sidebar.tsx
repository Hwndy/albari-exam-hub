import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  FileText,
  Settings,
  ChevronDown,
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

const superAdminMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    value: "overview",
  },
  {
    title: "Schools",
    icon: Building2,
    value: "schools",
  },
  {
    title: "Users",
    icon: Users,
    value: "users",
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    value: "analytics",
  },
  {
    title: "System Logs",
    icon: FileText,
    value: "logs",
    sub: [
      { title: "Email Logs", value: "email-logs" },
      { title: "Audit Logs", value: "audit-logs" },
    ],
  },
];

export function SuperAdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "overview";
  const currentSubTab = searchParams.get("subtab");
  
  const [openGroups, setOpenGroups] = useState<string[]>(["logs"]);

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
      navigate(`/super-admin?tab=${value}&subtab=${subValue}`);
    } else {
      navigate(`/super-admin?tab=${value}`);
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
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Super Admin Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {superAdminMenuItems.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.sub && item.sub.length > 0;
                const isGroupActive = isParentActive(item.value);

                if (hasSubItems) {
                  return (
                    <Collapsible
                      key={item.value}
                      open={openGroups.includes(item.value)}
                      onOpenChange={() => toggleGroup(item.value)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={
                                    isGroupActive
                                      ? "bg-primary/10 text-primary font-medium"
                                      : ""
                                  }
                                >
                                  <Icon className="h-4 w-4" />
                                  {!collapsed && <span>{item.title}</span>}
                                  {!collapsed && (
                                    <ChevronDown
                                      className={`ml-auto h-4 w-4 transition-transform ${
                                        openGroups.includes(item.value)
                                          ? "rotate-180"
                                          : ""
                                      }`}
                                    />
                                  )}
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            </TooltipTrigger>
                            {collapsed && (
                              <TooltipContent side="right">
                                {item.title}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.sub?.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.value}>
                                <SidebarMenuSubButton
                                  onClick={() =>
                                    handleNavigation(item.value, subItem.value)
                                  }
                                  className={
                                    isActive(item.value, subItem.value)
                                      ? "bg-primary/10 text-primary font-medium"
                                      : ""
                                  }
                                >
                                  <span>{subItem.title}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.value}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => handleNavigation(item.value)}
                            className={
                              isActive(item.value)
                                ? "bg-primary/10 text-primary font-medium"
                                : ""
                            }
                          >
                            <Icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
