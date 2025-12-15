import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function MaintenancePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Schedule Maintenance
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Equipment</p>
                  <p className="text-2xl font-bold">45</p>
                </div>
                <Wrench className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Due Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">8</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">34</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search maintenance records..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Schedule</CardTitle>
            <CardDescription>Track and manage equipment maintenance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Equipment</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Last Service</th>
                    <th className="text-left py-3 px-4">Next Due</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">Excavator CAT 320</td>
                    <td className="py-3 px-4">Routine</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Overdue
                      </span>
                    </td>
                    <td className="py-3 px-4">2024-10-15</td>
                    <td className="py-3 px-4">2024-12-01</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">Schedule</Button>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">Bulldozer D6T</td>
                    <td className="py-3 px-4">Routine</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Due Soon
                      </span>
                    </td>
                    <td className="py-3 px-4">2024-11-01</td>
                    <td className="py-3 px-4">2024-12-26</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">Schedule</Button>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">Crane Liebherr LTM</td>
                    <td className="py-3 px-4">Inspection</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </td>
                    <td className="py-3 px-4">2024-12-10</td>
                    <td className="py-3 px-4">2025-03-10</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">View</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
