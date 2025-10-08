import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  border: 1px solid ${(props) => props.theme.colors.text.yellow};
  background: transparent;
  color: ${(props) => props.theme.colors.text.yellow};
  font-size: 12px;
  font-weight: 500;

  &:hover:not(.disabled) {
    border-color: ${(props) => props.theme.colors.text.yellow};
    background: ${(props) => props.theme.colors.text.yellow}10;
    color: ${(props) => props.theme.colors.text.yellow};
  }

  &.active {
    background: ${(props) => props.theme.colors.text.yellow};
    border-color: ${(props) => props.theme.colors.text.yellow};
    color: #fff;
  }

  &.disabled {
    color: ${(props) => props.theme.button.disabled.color};
    background: ${(props) => props.theme.button.disabled.bg};
    border-color: ${(props) => props.theme.button.disabled.border};
    cursor: not-allowed;
  }

  .button-content {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .button-text {
    font-size: 12px;
    font-weight: 500;
  }

  .paw-icon {
    color: inherit;
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
