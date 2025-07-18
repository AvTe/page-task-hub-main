import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Plus,
  Edit3,
  Trash2,
  Timer,
  Calendar,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { formatDistanceToNow, format } from 'date-fns';

interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface TimeTrackerProps {
  taskId: string;
  taskTitle: string;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ taskId, taskTitle }) => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAddingManual, setIsAddingManual] = useState(false);
  
  const [manualEntry, setManualEntry] = useState({
    start_time: '',
    end_time: '',
    description: ''
  });

  // Load time entries
  useEffect(() => {
    loadTimeEntries();
  }, [taskId]);

  // Timer effect for active tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeEntry) {
      interval = setInterval(() => {
        const startTime = new Date(activeEntry.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading time entries:', error);
        setError('Failed to load time entries');
        return;
      }

      setTimeEntries(data || []);
      
      // Check for active entry
      const active = data?.find(entry => !entry.end_time);
      setActiveEntry(active || null);

    } catch (error) {
      console.error('Error loading time entries:', error);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting timer:', error);
        setError('Failed to start timer');
        return;
      }

      setActiveEntry(data);
      setElapsedTime(0);

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: user?.id,
        p_activity_type: 'time_tracking_started',
        p_activity_description: `Started time tracking for: ${taskTitle}`,
        p_metadata: { 
          task_id: taskId, 
          time_entry_id: data.id
        }
      });

    } catch (error) {
      console.error('Error starting timer:', error);
      setError('Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    try {
      setLoading(true);
      setError(null);

      const endTime = new Date().toISOString();
      const startTime = new Date(activeEntry.start_time).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const durationMinutes = Math.round((endTimeMs - startTime) / (1000 * 60));

      const { error } = await supabase
        .from('task_time_entries')
        .update({
          end_time: endTime,
          duration_minutes: durationMinutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeEntry.id);

      if (error) {
        console.error('Error stopping timer:', error);
        setError('Failed to stop timer');
        return;
      }

      setActiveEntry(null);
      setElapsedTime(0);
      loadTimeEntries();

      // Log activity
      await supabase.rpc('log_user_activity', {
        p_user_id: user?.id,
        p_activity_type: 'time_tracking_stopped',
        p_activity_description: `Stopped time tracking for: ${taskTitle} (${durationMinutes} minutes)`,
        p_metadata: { 
          task_id: taskId, 
          time_entry_id: activeEntry.id,
          duration_minutes: durationMinutes
        }
      });

    } catch (error) {
      console.error('Error stopping timer:', error);
      setError('Failed to stop timer');
    } finally {
      setLoading(false);
    }
  };

  const addManualEntry = async () => {
    if (!manualEntry.start_time || !manualEntry.end_time) return;

    try {
      setLoading(true);
      setError(null);

      const startTime = new Date(manualEntry.start_time).getTime();
      const endTime = new Date(manualEntry.end_time).getTime();
      
      if (endTime <= startTime) {
        setError('End time must be after start time');
        return;
      }

      const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

      const { error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          start_time: manualEntry.start_time,
          end_time: manualEntry.end_time,
          duration_minutes: durationMinutes,
          description: manualEntry.description || null
        });

      if (error) {
        console.error('Error adding manual entry:', error);
        setError('Failed to add time entry');
        return;
      }

      setManualEntry({ start_time: '', end_time: '', description: '' });
      setIsAddingManual(false);
      loadTimeEntries();

    } catch (error) {
      console.error('Error adding manual entry:', error);
      setError('Failed to add time entry');
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Error deleting time entry:', error);
        setError('Failed to delete time entry');
        return;
      }

      loadTimeEntries();

    } catch (error) {
      console.error('Error deleting time entry:', error);
      setError('Failed to delete time entry');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Time Tracking
            {totalMinutes > 0 && (
              <Badge variant="secondary">
                Total: {formatDuration(totalMinutes)}
              </Badge>
            )}
          </div>
          <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Time Entry</DialogTitle>
                <DialogDescription>
                  Add time spent on "{taskTitle}"
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={manualEntry.start_time}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={manualEntry.end_time}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={manualEntry.description}
                    onChange={(e) => setManualEntry(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What did you work on?"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingManual(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={addManualEntry} 
                    disabled={!manualEntry.start_time || !manualEntry.end_time || loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Entry
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Timer Controls */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-mono font-bold">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeEntry ? 'Timer running' : 'Timer stopped'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {activeEntry ? (
                <Button onClick={stopTimer} disabled={loading} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={startTimer} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Time Entries List */}
        {loading && timeEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading time entries...
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Timer className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No time entries yet. Start tracking your work!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Recent Entries</h4>
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Badge variant={entry.end_time ? "secondary" : "default"}>
                      {entry.duration_minutes ? formatDuration(entry.duration_minutes) : 'Running...'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(entry.start_time), 'MMM d, yyyy HH:mm')}
                      {entry.end_time && (
                        <> - {format(new Date(entry.end_time), 'HH:mm')}</>
                      )}
                    </div>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTimeEntry(entry.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeTracker;
