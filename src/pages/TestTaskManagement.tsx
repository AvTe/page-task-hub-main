import React from 'react';
import TaskManagementTest from '../components/TaskManagementTest';

const TestTaskManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Management Testing</h1>
          <p className="text-gray-600">
            Test the Supabase-powered task management system with real-time updates and database persistence.
          </p>
        </div>
        
        <TaskManagementTest />
      </div>
    </div>
  );
};

export default TestTaskManagement;
