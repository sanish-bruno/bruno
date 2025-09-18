import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 28px; /* Match the height of other items */
  
  &:hover {
    background-color: var(--color-gray-100);
  }
  
  .dark &:hover {
    background-color: var(--color-gray-800);
  }

  .indent-block {
    border-right: ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }
`;

export default StyledWrapper;
