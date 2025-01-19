import { Button, Container, Group, Text } from '@mantine/core';
import classes from './HeroTitle.module.css';
import { FeaturesCards } from './FeatureCards';
export function HeroTitle() {
  return (
    <div className={classes.wrapper}>
      {/* <Container size={700} className={classes.inner}>
        <h1 className={classes.title}>
          A{' '}
          <Text component="span" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} inherit>
            fully featured
          </Text>{' '}
          React components and hooks library
        </h1>

        <Text className={classes.description} color="dimmed">
          Build fully functional accessible web applications with ease – Mantine includes more than
          100 customizable components and hooks to cover you in any situation
        </Text>
        
      </Container> */}
      <Container className='pt-10 text-center'>
      <h1 className={classes.title}>
          一个{' '}
          <Text component="span" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} inherit>
            全功能 ?
          </Text>{' '}
          的考勤系统🔆
        </h1>

        <Text className={classes.description} c="dimmed">
          简单、轻松的进行考勤工作，摆脱繁琐低效的纸质考勤表。
        </Text>
        </Container>
      <FeaturesCards />
    </div>
  );
}