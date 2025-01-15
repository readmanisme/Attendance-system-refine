// export function TestPage() {
//   return (
//     <div>
//       {/* Test Page */}
//       <h1 className="text-4xl font-bold text-blue-500">
//         TailwindCSS 安装检测，此处文字应该是蓝色
//       </h1>
      
//     </div>
//   );
// }


import { useState } from 'react'
import { Table, Card, Button, Select, Typography, Badge, Space, message } from 'antd'
import { ClockCircleOutlined, CheckOutlined, LogoutOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

interface Employee {
  key: string
  name: string
  scheduledTime: string
  status: 'pending' | 'checked-in' | 'checked-out'
  checkInTime?: string
}

export  function TestPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [employees, setEmployees] = useState<Employee[]>([
    {
      key: '1',
      name: 'eeeeeeee',
      scheduledTime: '2025-01-02 12:00:00',
      status: 'checked-out'
    },
    {
      key: '2',
      name: 'gsfsf',
      scheduledTime: '2025-01-09 12:00:00',
      status: 'pending'
    },
    {
      key: '3',
      name: '1',
      scheduledTime: '2025-01-17 12:00:00',
      status: 'checked-in',
      checkInTime: '2025-01-15 13:33:28.885'
    },
    {
      key: '4',
      name: 'mutationOptions',
      scheduledTime: '2025-01-17 12:00:00',
      status: 'pending'
    }
  ])

  const columns: ColumnsType<Employee> = [
    {
      title: '员工姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '预定上班时间',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          {text}
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        const statusMap = {
          pending: { text: '待签到', color: 'warning' },
          'checked-in': { text: '已签到', color: 'success' },
          'checked-out': { text: '已签退', color: 'default' }
        }
        const current = statusMap[status as keyof typeof statusMap]
        return <Badge status={current.color as any} text={current.text} />
      }
    },
    {
      title: '签到时间',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (text) => text || '-'
    }
  ]

  const handleCheckIn = () => {
    if (!selectedEmployee) {
      message.warning('请选择员工')
      return
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.key === selectedEmployee) {
        return {
          ...emp,
          status: 'checked-in',
          checkInTime: new Date().toLocaleString()
        }
      }
      return emp
    }))
    message.success('签到成功')
    setSelectedEmployee('')
  }

  const handleCheckOut = () => {
    if (!selectedEmployee) {
      message.warning('请选择员工')
      return
    }

    setEmployees(prev => prev.map(emp => {
      if (emp.key === selectedEmployee) {
        return {
          ...emp,
          status: 'checked-out'
        }
      }
      return emp
    }))
    message.success('签退成功')
    setSelectedEmployee('')
  }

  const pendingEmployees = employees.filter(emp => emp.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <Card className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Title level={3} className="!mb-6 text-center">
            员工签到系统
          </Title>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <Select
              placeholder="请选择待签到人员"
              style={{ width: '100%', maxWidth: 300 }}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              options={pendingEmployees.map(emp => ({
                value: emp.key,
                label: emp.name
              }))}
            />
            <Space>
              <Button 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={handleCheckIn}
              >
                上班打卡
              </Button>
              <Button 
                danger
                icon={<LogoutOutlined />}
                onClick={handleCheckOut}
              >
                下班打卡
              </Button>
            </Space>
          </div>
        </div>

        <Table 
          columns={columns} 
          dataSource={employees}
          pagination={false}
          rowClassName={(record) => 
            record.status === 'checked-in' ? 'bg-blue-50' : ''
          }
        />
      </Card>
    </div>
  )
}

