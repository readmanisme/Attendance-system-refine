import PocketBase from "pocketbase";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { Button, notification, Space, Spin } from "antd";

export function BackupDatabase() {
  const pb = new PocketBase(__BACKEND_API_URL__);
  const today = dayjs().format("YYYY-MM-DD");
  const [needBackup, setneedBackup] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const [backuping, setBackuping] = useState(false);
  const Notifi_key = `open${Date.now()}`;
  const openBackupNotification = () => {
    const key = Notifi_key;
    const btn = (
      <Space>
        <Button type="primary" size="small" onClick={() => backup_database()}>
          备份
        </Button>
        <Button type="link" size="small" onClick={() => {api.destroy(key);
          localStorage.setItem("backupAlertDismissed", today)
        }}>
          今日不再提醒
        </Button>
      </Space>
    );
    api.info({
      message: "需要备份数据库",
      description:
        "今天的数据库尚未备份，为了数据安全，请点击下方按钮备份数据库。",
      btn,
      key,
      // closeIcon: null,
      duration: 0,
    });
  };
  const list_backups = async () => {
    await pb
      .collection("_superusers")
      .authWithPassword(__Backend_UserName__, __Backend_Password__);
    const backups = await pb.backups.getFullList();
    // 检查每个字典的key字段中是否包含today
    return backups.filter((backup) => backup.key.includes(today));
  };
  const backup_database = async () => {
    await pb
      .collection("_superusers")
      .authWithPassword(__Backend_UserName__, __Backend_Password__);
    setBackuping(true);
    api.info({
      message: "备份中",
      description: "正在备份数据库，请稍等，暂时不要进行其他操作或关闭此页面。",
      key: Notifi_key,
      duration: 0,
    });
    const result=await pb.backups.create(`pocketbase-${today}-backup.zip`);
    // 不能有大写字母，否则会报错
    setBackuping(false);
    if (result){
        api.success({
            message: "备份成功",
            description: "数据库备份成功，此通知即将关闭",
            key: Notifi_key,
            showProgress: true,
            // pauseOnHover: true,
            duration: 3,
          });
    }
    else{
        api.error({
            message: "备份失败",
            description: `"数据库备份失败"`,
            key: Notifi_key,
            showProgress: true,
            // pauseOnHover: true,
            duration: 3,
          }); 
    }

  };
  useEffect(() => {
    const checkForBackup = async () => {
      const backups = await list_backups();
      if (backups.length === 0 && localStorage.getItem('backupAlertDismissed') !== today) {
        setneedBackup(true);
        openBackupNotification();
      }
    };
    checkForBackup();
  }, []);
  return (
    <div>
      {contextHolder}
      {backuping && <Spin size="large" fullscreen={true} tip="正在备份数据库..." />}
    </div>
  );
}
