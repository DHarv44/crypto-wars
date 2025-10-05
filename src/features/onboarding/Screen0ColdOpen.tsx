import { useEffect, useState } from 'react';
import { Stack, Title, Text, Box } from '@mantine/core';
import { useStore } from '../../stores/rootStore';
import { getAllProfiles } from '../../utils/storage';

const TICKER_ITEMS = [
  { symbol: 'YOLO/REKT', change: '+420.69%', color: 'darkGreen.5' },
  { symbol: 'RUG/POOL', change: '−99.99%', color: 'darkRed.5' },
  { symbol: 'WAGMI', change: '+7.77%', color: 'darkGreen.5' },
  { symbol: 'HODL', change: '−12.34%', color: 'darkRed.5' },
  { symbol: 'MOON', change: '+100.00%', color: 'darkGreen.5' },
];

export default function Screen0ColdOpen() {
  const { setScreen } = useStore();
  const [showRocket, setShowRocket] = useState(false);
  const [canProceed, setCanProceed] = useState(false);

  const handleProceed = () => {
    if (canProceed) {
      setShowRocket(true);
      const profiles = getAllProfiles();
      // If profiles exist, go to profile select (screen 0.5), otherwise go to handle screen
      const nextScreen = profiles.length > 0 ? 0.5 : 1;
      setTimeout(() => setScreen(nextScreen), 800);
    }
  };

  useEffect(() => {
    // Enable key press after 2 seconds
    const timer = setTimeout(() => setCanProceed(true), 2000);

    const handleKeyPress = () => {
      handleProceed();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [canProceed, setScreen]);

  return (
    <Box
      onClick={handleProceed}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(180deg, #000000 0%, #0B0E12 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: canProceed ? 'pointer' : 'default',
      }}
    >
      <Stack align="center" gap="xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Title with neon glow */}
        <Box style={{ position: 'relative' }}>
          <Title
            order={1}
            size="4rem"
            ff="monospace"
            fw={100}
            c="terminal.5"
            style={{
              textShadow: showRocket
                ? '0 0 40px #00ff00, 0 0 80px #00ff00'
                : '0 0 20px #00ff00, 0 0 40px #00ff00',
              animation: 'pulse 2s ease-in-out infinite',
              letterSpacing: '0.5rem',
              transition: 'text-shadow 0.3s',
            }}
          >
            CRYPTO WARS
          </Title>

          {/* Rocket flare */}
          {showRocket && (
            <Box
              style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #00ff00, transparent)',
                animation: 'rocket-flare 0.8s ease-out',
              }}
            />
          )}
        </Box>

        {/* Ticker tape */}
        <Box
          style={{
            width: '100vw',
            overflow: 'hidden',
            background: 'rgba(0, 255, 0, 0.05)',
            padding: '0.5rem 0',
            borderTop: '1px solid rgba(0, 255, 0, 0.2)',
            borderBottom: '1px solid rgba(0, 255, 0, 0.2)',
          }}
        >
          <Box
            style={{
              display: 'flex',
              gap: '3rem',
              animation: 'scroll-ticker 15s linear infinite',
              whiteSpace: 'nowrap',
            }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <Text key={i} ff="monospace" size="sm" span>
                <Text span c="dimmed">
                  {item.symbol}
                </Text>{' '}
                <Text span c={item.color} fw={700}>
                  {item.change}
                </Text>
              </Text>
            ))}
          </Box>
        </Box>

        {/* CTA */}
        {canProceed && (
          <Stack align="center" gap="xs" style={{ animation: 'fadeIn 1s ease-in' }}>
            <Text
              size="xl"
              ff="monospace"
              c="terminal.5"
              fw={700}
              style={{
                animation: 'blink 1.5s ease-in-out infinite',
              }}
            >
              SEND IT 📈
            </Text>
            <Text size="xs" c="dimmed" fs="italic">
              Not financial advice. Mostly bad advice.
            </Text>
          </Stack>
        )}
      </Stack>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes scroll-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }

        @keyframes rocket-flare {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </Box>
  );
}
