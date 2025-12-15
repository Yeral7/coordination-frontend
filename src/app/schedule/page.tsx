import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'

export default function SchedulePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Calendar View
                </CardTitle>
                <CardDescription>View and manage schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <CalendarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Calendar component will be integrated here</p>
                  <p className="text-sm text-slate-500 mt-2">Consider using react-big-calendar or similar</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Equipment Delivery</p>
                      <p className="text-sm text-slate-600">Today, 2:00 PM</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500">Site A</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Team Meeting</p>
                      <p className="text-sm text-slate-600">Tomorrow, 9:00 AM</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500">Office</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Maintenance Check</p>
                      <p className="text-sm text-slate-600">Dec 15, 10:00 AM</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-500">Workshop</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
