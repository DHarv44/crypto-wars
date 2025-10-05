import { AppShell as MantineAppShell, NavLink, Text, Stack, HoverCard } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconChartLine, IconHome, IconBuildingBank, IconRocket, IconUsers, IconChartBar, IconLock } from '@tabler/icons-react';
import { ReactNode } from 'react';
import Header from './Header';
import { useStore } from '../stores/rootStore';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unlocks, getUnlockProgress } = useStore();

  // Core features always visible
  const coreNavItems = [
    { path: '/', label: 'Dashboard', icon: IconHome },
    { path: '/market', label: 'Market', icon: IconChartLine },
    { path: '/social', label: 'Social', icon: IconUsers },
  ];

  // Gated features - only show if unlocked
  const gatedNavItems = [
    {
      path: '/influencer',
      label: 'Influencer',
      icon: IconUsers,
      feature: 'influencer' as const,
    },
    {
      path: '/ops',
      label: 'Operations',
      icon: IconRocket,
      feature: 'operations' as const,
    },
    {
      path: '/offers',
      label: 'Offers',
      icon: IconBuildingBank,
      feature: 'offers' as const,
    },
  ];

  const reportsNavItem = { path: '/reports', label: 'Reports', icon: IconChartBar };

  // Split gated items into unlocked and locked-but-visible
  const unlockedGatedItems = gatedNavItems.filter(
    item => unlocks[item.feature]?.unlocked
  );

  const lockedVisibleItems = gatedNavItems.filter(
    item => unlocks[item.feature]?.visible && !unlocks[item.feature]?.unlocked
  );

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Header />
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <MantineAppShell.Section grow>
          <Stack gap="xs">
            {/* Core features */}
            {coreNavItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} />}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                c={location.pathname === item.path ? 'terminal.5' : undefined}
              />
            ))}

            {/* Unlocked gated features */}
            {unlockedGatedItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} />}
                active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                c={location.pathname === item.path ? 'terminal.5' : undefined}
              />
            ))}

            {/* Locked but visible features (with popover) */}
            {lockedVisibleItems.map((item) => {
              const unlock = unlocks[item.feature];
              const progress = getUnlockProgress(item.feature);

              return (
                <HoverCard
                  key={item.path}
                  position="right"
                  withArrow
                  shadow="md"
                  openDelay={200}
                  closeDelay={100}
                >
                  <HoverCard.Target>
                    <div>
                      <NavLink
                        label={item.label}
                        leftSection={<IconLock size={20} />}
                        disabled
                        style={{ opacity: 0.5, cursor: 'help' }}
                      />
                    </div>
                  </HoverCard.Target>
                  <HoverCard.Dropdown bg="dark.9" c="gray.2">
                    <Stack gap="sm">
                      <Text size="sm" fw={700} c="white">
                        {unlock.name}
                      </Text>
                      <Text size="xs" c="gray.4">
                        {unlock.description}
                      </Text>
                      <Text size="xs" fw={600} c="terminal.5">
                        ✨ {unlock.perk}
                      </Text>
                      <Text size="xs" c="gray.5" tt="uppercase" fw={700} mt="xs">
                        Requirements
                      </Text>
                      <Text size="xs" ff="monospace" c="gray.3">
                        {progress}
                      </Text>
                    </Stack>
                  </HoverCard.Dropdown>
                </HoverCard>
              );
            })}

            {/* Reports (always visible) */}
            <NavLink
              label={reportsNavItem.label}
              leftSection={<reportsNavItem.icon size={20} />}
              active={location.pathname === reportsNavItem.path}
              onClick={() => navigate(reportsNavItem.path)}
              c={location.pathname === reportsNavItem.path ? 'terminal.5' : undefined}
            />
          </Stack>
        </MantineAppShell.Section>

        <MantineAppShell.Section>
          <Text size="xs" c="dimmed" ta="center">
            Simulated crypto market
            <br />
            Not financial advice
          </Text>
        </MantineAppShell.Section>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
}
