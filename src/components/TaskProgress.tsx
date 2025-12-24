import React from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  TrendingUp,
  Calendar,
  Flag,
  Users,
  Timer
} from 'lucide-react';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';

interface TaskProgressProps {
  tasks?: Task[];
  showDetailed?: boolean;
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
}

const TaskProgress: React.FC<TaskProgressProps> = ({
  tasks,
  showDetailed = true,
  timeframe = 'month'
}) => {
  const { state } = useTask();

  // Use provided tasks or get all tasks from context
  const allTasks = tasks || [
    ...state.pages.flatMap(page => page.tasks),
    ...state.unassignedTasks
  ];

  // Calculate basic statistics
  const getBasicStats = () => {
    const total = allTasks.length;
    const completed = allTasks.filter(task => task.status === 'done').length;
    const inProgress = allTasks.filter(task => task.status === 'progress').length;
    const todo = allTasks.filter(task => task.status === 'todo').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, todo, completionRate };
  };

  // Calculate priority distribution
  const getPriorityStats = () => {
    const urgent = allTasks.filter(task => task.priority === 'urgent').length;
    const high = allTasks.filter(task => task.priority === 'high').length;
    const medium = allTasks.filter(task => task.priority === 'medium').length;
    const low = allTasks.filter(task => task.priority === 'low').length;

    return { urgent, high, medium, low };
  };

  // Calculate due date statistics
  const getDueDateStats = () => {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const nextWeek = addDays(now, 7);

    const overdue = allTasks.filter(task =>
      task.dueDate &&
      isBefore(new Date(task.dueDate), now) &&
      task.status !== 'done'
    ).length;

    const dueSoon = allTasks.filter(task =>
      task.dueDate &&
      isAfter(new Date(task.dueDate), now) &&
      isBefore(new Date(task.dueDate), tomorrow) &&
      task.status !== 'done'
    ).length;

    const dueThisWeek = allTasks.filter(task =>
      task.dueDate &&
      isAfter(new Date(task.dueDate), tomorrow) &&
      isBefore(new Date(task.dueDate), nextWeek) &&
      task.status !== 'done'
    ).length;

    return { overdue, dueSoon, dueThisWeek };
  };

  // Calculate productivity metrics
  const getProductivityMetrics = () => {
    const now = new Date();
    const weekAgo = addDays(now, -7);
    const monthAgo = addDays(now, -30);

    const completedThisWeek = allTasks.filter(task =>
      task.status === 'done' &&
      task.completedAt &&
      isAfter(new Date(task.completedAt), weekAgo)
    ).length;

    const completedThisMonth = allTasks.filter(task =>
      task.status === 'done' &&
      task.completedAt &&
      isAfter(new Date(task.completedAt), monthAgo)
    ).length;

    const averageCompletionTime = allTasks
      .filter(task => task.status === 'done' && task.completedAt)
      .reduce((acc, task) => {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt!);
        return acc + differenceInDays(completed, created);
      }, 0) / Math.max(1, allTasks.filter(task => task.status === 'done').length);

    return { completedThisWeek, completedThisMonth, averageCompletionTime };
  };

  const basicStats = getBasicStats();
  const priorityStats = getPriorityStats();
  const dueDateStats = getDueDateStats();
  const productivityMetrics = getProductivityMetrics();

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{basicStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{basicStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{basicStats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{dueDateStats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm text-muted-foreground">{basicStats.completionRate}%</span>
            </div>
            <Progress value={basicStats.completionRate} className="h-2" />
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{basicStats.todo}</p>
              <p className="text-sm text-muted-foreground">To Do</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{basicStats.inProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{basicStats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showDetailed && (
        <>
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="w-3 h-3 p-0 rounded-full"></Badge>
                    <span className="text-sm">Urgent</span>
                  </div>
                  <span className="text-sm font-medium">{priorityStats.urgent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="w-3 h-3 p-0 rounded-full bg-orange-500"></Badge>
                    <span className="text-sm">High</span>
                  </div>
                  <span className="text-sm font-medium">{priorityStats.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="w-3 h-3 p-0 rounded-full bg-blue-500"></Badge>
                    <span className="text-sm">Medium</span>
                  </div>
                  <span className="text-sm font-medium">{priorityStats.medium}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-3 h-3 p-0 rounded-full"></Badge>
                    <span className="text-sm">Low</span>
                  </div>
                  <span className="text-sm font-medium">{priorityStats.low}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Date Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Due Date Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dueDateStats.overdue > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">Overdue Tasks</span>
                    </div>
                    <Badge variant="destructive">{dueDateStats.overdue}</Badge>
                  </div>
                )}

                {dueDateStats.dueSoon > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Due Tomorrow</span>
                    </div>
                    <Badge className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">{dueDateStats.dueSoon}</Badge>
                  </div>
                )}

                {dueDateStats.dueThisWeek > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Due This Week</span>
                    </div>
                    <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">{dueDateStats.dueThisWeek}</Badge>
                  </div>
                )}

                {dueDateStats.overdue === 0 && dueDateStats.dueSoon === 0 && dueDateStats.dueThisWeek === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">All tasks are on track!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Productivity Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Productivity Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{productivityMetrics.completedThisWeek}</p>
                  <p className="text-sm text-muted-foreground">Completed This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{productivityMetrics.completedThisMonth}</p>
                  <p className="text-sm text-muted-foreground">Completed This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(productivityMetrics.averageCompletionTime)}d
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TaskProgress;
