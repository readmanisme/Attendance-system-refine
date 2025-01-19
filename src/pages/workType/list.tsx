import React from "react";
import { BaseRecord } from "@refinedev/core";
import {
    useTable,
    List,
    EditButton,
    ShowButton,
    DeleteButton,
    DateField,
} from "@refinedev/antd";
import { Table, Space, Button, Drawer } from "antd";
import Paragraph from "antd/es/typography/Paragraph";

export const ListWorkType = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });
    const [helpOpen, setHelpOpen] = React.useState(false);
    return (
        <List
        headerButtons={({ defaultButtons }) => (
            <>
              {defaultButtons}
              <Button type="primary" onClick={() => setHelpOpen(true)}>查看帮助</Button>
              <Drawer title="帮助" open={helpOpen} onClose={() => setHelpOpen(false)}>
              <Paragraph>1、此处的“基础”工作类型为系统内置，不可删除或修改，只能查看。用于作为基础薪资的计算。</Paragraph>
            </Drawer>
            </>
          )}
        >
            <Table {...tableProps} rowKey="id">
                {/* <Table.Column
                    dataIndex="collectionName"
                    title="Collection Name"
                /> */}
                {/* <Table.Column
                    dataIndex={["created"]}
                    title="Created"
                    render={(value: any) => <DateField value={value} />}
                /> */}
                <Table.Column dataIndex="id" title="Id" />
                <Table.Column dataIndex="name" title="名字" />
                {/* <Table.Column
                    dataIndex={["updated"]}
                    title="Updated"
                    render={(value: any) => <DateField value={value} />}
                /> */}
                <Table.Column
                    title="Actions"
                    dataIndex="actions"
                    render={(_, record: BaseRecord) => (
                        <Space>
                            <EditButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                            <ShowButton
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                            <DeleteButton
                            disabled={record.name === "基础"}
                                hideText
                                size="small"
                                recordItemId={record.id}
                            />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
