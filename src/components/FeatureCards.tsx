import {
  IconCommand,
  IconCookie,
  IconGauge,
  IconUser,
  IconChecks,
  IconUsers,
  IconList,
  IconClipboardData,
  IconLockSquareRounded,
  IconMicroscope,
  IconCoinYen,
  IconReport,
  IconHome,
  IconBriefcase,
  IconHelp,
  IconBrightness,
  IconArchive,
  IconSquareArrowUp
} from "@tabler/icons-react";
import {
  Badge,
  Card,
  Container,
  Group,
  SimpleGrid,
  Text,
  Title,
  useMantineTheme,
  Kbd,
} from "@mantine/core";
import classes from "./FeaturesCards.module.css";

const mockdata = [
  {
    title: "签到",
    description:
      "选择人员，选择工作，点击按钮即可签到和签退，并可以表格中浏览今日签到记录。并拥有批量模式",
    icon: IconChecks,
  },
  {
    title: "考勤记录",
    description:
      "轻松浏览任何时期的考勤记录。",
    icon: IconClipboardData,
  },
  {
    title: "人员管理",
    description:
      "创建、查看、编辑、删除人员信息。并可以批量导入人员信息。",
    icon: IconUsers,
  },
  {
    title: "工作管理",
    description:
      "创建、查看、编辑、删除工作信息。",
    icon: IconBriefcase,
  },
  {
    title: "薪资管理",
    description:
      "创建、查看、编辑、删除各工种、各人员的薪资信息。摆脱抄录计算。",
    icon: IconCoinYen,
  },
  {
    title: "工时&薪资管理",
    description:
      "查看每人在每天，每月，每年的工时和其所应该获得的薪资。并可导出详细的工时薪资记录表。",
    icon: IconReport,
  },
  {
    title: "后台管理",
    description:
      "供使用人员进行高级操作。",
    icon: IconLockSquareRounded,
  },
  {
    title: "帮助信息",
    description:
      "存在疑问？随时点击右下角帮助按钮查看帮助信息。",
    icon: IconHelp,
  },
  {
    title: "kbar",
    description: (
      <>
        按下 <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>{" "}
        即可打开面板，进行快速跳转与快速操作。
      </>
    ),
    icon: IconCommand,
  },
  {
    title: "暗黑模式",
    description: "全页面适配，点击右上角按钮切换暗黑模式。",
    icon: IconBrightness,
  },
  {
    title: "数据安全",
    description: "每日备份提醒，为你的数据保驾护航。",
    icon: IconArchive,
  },
  {
    title: "一键回顶",
    description: "点击右下角回到顶部按钮，即可快速回到页面顶部。",
    icon: IconSquareArrowUp,
  },
];

export function FeaturesCards() {
  const theme = useMantineTheme();
  const features = mockdata.map((feature) => (
    <Card
      key={feature.title}
      shadow="md"
      radius="md"
      className={classes.card}
      padding="xl"
    >
      <feature.icon size={50} stroke={2} color={theme.colors.blue[6]} />
      <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
        {feature.title}
      </Text>
      <Text fz="sm" c="dimmed" mt="sm">
        {feature.description}
      </Text>
    </Card>
  ));

  return (
    <Container size="lg" py="xl">
      <Group justify="center">
        <Badge
          variant="filled"
          size="lg"
          style={{ width: 150, height: 10 }}
        ></Badge>
      </Group>

      <Title order={2} className={classes.title} ta="center" mt="sm">
        一切你所需要的功能
      </Title>

      {/* <Text c="dimmed" className={classes.description} ta="center" mt="md">
        Every once in a while, you’ll see a Golbat that’s missing some fangs. This happens when
        hunger drives it to try biting a Steel-type Pokémon.
      </Text> */}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
        {features}
      </SimpleGrid>
    </Container>
  );
}
