import styled from 'styled-components';

const StyledWrapper = styled.div`
  .btn {
    @apply px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200;
  }

  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400;
  }

  .btn-secondary {
    @apply bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400;
  }

  .btn-outline {
    @apply border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700;
  }

  .btn-sm {
    @apply px-3 py-1.5 text-xs;
  }

  input[type="range"] {
    @apply w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer;
  }

  input[type="range"]::-webkit-slider-thumb {
    @apply appearance-none h-4 w-4 bg-blue-600 rounded-full cursor-pointer;
  }

  input[type="range"]::-moz-range-thumb {
    @apply h-4 w-4 bg-blue-600 rounded-full cursor-pointer border-0;
  }
`;

export default StyledWrapper; 