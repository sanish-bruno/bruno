import styled from 'styled-components';

const StyledWrapper = styled.div`
  .btn {
    @apply px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200;
  }

  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400;
  }

  .btn-outline {
    @apply border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

export default StyledWrapper; 