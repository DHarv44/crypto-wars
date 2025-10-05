import { MantineColorsTuple, createTheme } from '@mantine/core';

// Dark terminal aesthetic color palette
const darkGreen: MantineColorsTuple = [
  '#d4ffd4',
  '#a8ffa8',
  '#7cff7c',
  '#50ff50',
  '#24ff24',
  '#00ff00',
  '#00cc00',
  '#009900',
  '#006600',
  '#003300',
];

const darkRed: MantineColorsTuple = [
  '#ffe0e0',
  '#ffb3b3',
  '#ff8686',
  '#ff5959',
  '#ff2c2c',
  '#ff0000',
  '#cc0000',
  '#990000',
  '#660000',
  '#330000',
];

const terminal: MantineColorsTuple = [
  '#e0e0e0',
  '#c0c0c0',
  '#a0a0a0',
  '#808080',
  '#606060',
  '#00ff00',
  '#303030',
  '#202020',
  '#101010',
  '#000000',
];

export const mantineTheme = createTheme({
  primaryColor: 'terminal',
  colors: {
    terminal,
    darkGreen,
    darkRed,
  },
  defaultRadius: 'sm',
  fontFamily: "'Courier New', 'Courier', monospace",
  headings: {
    fontFamily: "'Courier New', 'Courier', monospace",
    fontWeight: '700',
  },
  components: {
    Button: {
      defaultProps: {
        variant: 'light',
      },
    },
    Table: {
      defaultProps: {
        highlightOnHover: true,
        verticalSpacing: 'xs',
      },
    },
  },
});
