import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTask } from '../contexts/TaskContext';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useSupabaseWorkspace } from '../contexts/SupabaseWorkspaceContext';
import ModernLayout from '../components/ModernLayout';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckSquare,
  AlertCircle,
  Video,
  Users,
  Bell,
  Target,
  Search,
  Filter,
  MapPin,
  Link as LinkIcon,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isSameDay, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'task' | 'meeting' | 'reminder' | 'goal';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attendees?: string[];
  meetingLink?: string;
  location?: string;
  taskId?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface TimeSlot {
  time: string;
  available: boolean;
  suggested?: boolean;
}

const Calendar: React.FC = () => {
  const { state } = useTask();
  const { user } = useAuth();
  const { currentWorkspace, workspaceMembers } = useSupabaseWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showFindTimeDialog, setShowFindTimeDialog] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestedTimes, setSuggestedTimes] = useState<TimeSlot[]>([]);

  // Event form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting' as const,
    priority: 'medium' as const,
    attendees: [] as string[],
    meetingLink: '',
    location: ''
  });

  // Find time form state
  const [findTimeForm, setFindTimeForm] = useState({
    duration: 60, // minutes
    preferredTimes: ['09:00', '14:00'],
    attendees: [] as string[],
    dateRange: 7 // days
  });

  // Load events from tasks and calendar events
  useEffect(() => {
    loadCalendarEvents();
  }, [state.pages, state.unassignedTasks, currentDate]);

  const loadCalendarEvents = () => {
    const taskEvents: CalendarEvent[] = [];

    // Convert tasks with due dates to calendar events
    [...state.unassignedTasks, ...state.pages.flatMap(p => p.tasks)]
      .filter(task => task.dueDate)
      .forEach(task => {
        taskEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          description: task.description,
          startTime: '09:00',
          endTime: '10:00',
          date: task.dueDate!.split('T')[0],
          type: 'task',
          priority: task.priority,
          taskId: task.id,
          status: task.status === 'done' ? 'completed' : 'pending'
        });
      });

    // Add some sample calendar events for demo
    const sampleEvents: CalendarEvent[] = [
      {
        id: 'meeting-1',
        title: 'Team Standup',
        description: 'Daily team synchronization meeting',
        startTime: '09:00',
        endTime: '09:30',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'meeting',
        priority: 'high',
        attendees: workspaceMembers.map(m => m.email),
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        status: 'confirmed'
      },
      {
        id: 'goal-1',
        title: 'Complete Project Milestone',
        description: 'Finish the first phase of the project',
        startTime: '17:00',
        endTime: '17:30',
        date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
        type: 'goal',
        priority: 'urgent',
        status: 'pending'
      }
    ];

    setEvents([...taskEvents, ...sampleEvents]);
  };

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Get events for a specific date
  const getEventsForDate = (date: number) => {
    const dateStr = format(new Date(currentYear, currentMonth, date), 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr);
  };

  // Find available time slots
  const findAvailableTimeSlots = () => {
    const slots: TimeSlot[] = [];
    const startDate = new Date();

    for (let day = 0; day < findTimeForm.dateRange; day++) {
      const currentDay = addDays(startDate, day);
      const dayStr = format(currentDay, 'yyyy-MM-dd');

      // Generate time slots for business hours (9 AM - 6 PM)
      for (let hour = 9; hour < 18; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const endTimeStr = `${(hour + 1).toString().padStart(2, '0')}:00`;

        // Check if this time slot conflicts with existing events
        const hasConflict = events.some(event =>
          event.date === dayStr &&
          event.startTime <= timeStr &&
          event.endTime > timeStr
        );

        slots.push({
          time: `${format(currentDay, 'MMM dd')} at ${timeStr}`,
          available: !hasConflict,
          suggested: findTimeForm.preferredTimes.includes(timeStr) && !hasConflict
        });
      }
    }

    setSuggestedTimes(slots.filter(slot => slot.available).slice(0, 10));
  };

  // Handle event creation
  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      date: newEvent.date,
      type: newEvent.type,
      priority: newEvent.priority,
      attendees: newEvent.attendees,
      meetingLink: newEvent.meetingLink,
      location: newEvent.location,
      status: 'confirmed'
    };

    setEvents(prev => [...prev, event]);
    setShowEventDialog(false);

    // Reset form
    setNewEvent({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      type: 'meeting',
      priority: 'medium',
      attendees: [],
      meetingLink: '',
      location: ''
    });

    toast.success('Event created successfully!');
  };

  // Generate meeting links
  const generateMeetingLink = (platform: 'google' | 'zoom' | 'teams') => {
    const links = {
      google: 'https://meet.google.com/new',
      zoom: 'https://zoom.us/start/webmeeting',
      teams: 'https://teams.microsoft.com/start'
    };

    setNewEvent(prev => ({ ...prev, meetingLink: links[platform] }));
    toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} meeting link added!`);
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'meeting': return 'bg-green-100 text-green-800 border-green-200';
      case 'reminder': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'goal': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-300';
    }
  };

  // Get tasks for a specific date (legacy function)
  const getTasksForDate = (date: number) => {
    // This is a simplified implementation
    // In a real app, you'd filter tasks by their due dates
    const allTasks = state.pages.flatMap(page => page.tasks).concat(state.unassignedTasks);
    return allTasks.filter((_, index) => index % 7 === date % 7).slice(0, 2); // Mock filtering
  };

  // Get today's date
  const today = new Date();
  const isToday = (date: number) => {
    return today.getDate() === date && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Get upcoming tasks (next 7 days)
  const upcomingTasks = state.pages
    .flatMap(page => page.tasks.map(task => ({ ...task, pageName: page.title })))
    .concat(state.unassignedTasks.map(task => ({ ...task, pageName: 'Unassigned' })))
    .filter(task => task.status !== 'done')
    .slice(0, 5); // Mock upcoming tasks

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your tasks by date
            </p>
          </div>
          <Button className="btn-orange">
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="card-modern">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {monthNames[currentMonth]} {currentYear}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 border rounded-lg ${
                        day === null 
                          ? 'bg-muted/30' 
                          : isToday(day)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background hover:bg-accent'
                      } transition-colors cursor-pointer`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            isToday(day) ? 'text-primary' : 'text-foreground'
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {getTasksForDate(day).map((task, taskIndex) => (
                              <div
                                key={taskIndex}
                                className="text-xs p-1 rounded bg-primary/20 text-primary truncate"
                              >
                                {task.title}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today's Tasks */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Today's Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTasks.slice(0, 3).map((task, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.pageName}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No tasks for today
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingTasks.slice(0, 4).map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.pageName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {index + 1}d
                      </Badge>
                    </div>
                  ))}
                  {upcomingTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming deadlines
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="text-sm font-medium">
                      {state.pages.reduce((total, page) => 
                        total + page.tasks.filter(task => task.status === 'done').length, 0
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="text-sm font-medium">
                      {state.pages.reduce((total, page) => 
                        total + page.tasks.filter(task => task.status === 'in-progress').length, 0
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Scheduled</span>
                    </div>
                    <span className="text-sm font-medium">
                      {state.pages.reduce((total, page) => 
                        total + page.tasks.filter(task => task.status === 'todo').length, 0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModernLayout>
  );
};

export default Calendar;
