import React, { FC } from 'react';
import { useDrag } from 'react-dnd';
import Icon from '../../controls/Icon';
import { StarterInfo } from '../../util/api';

interface IProps {
  children?: any;
  className?: string;
  item: StarterInfo;
}

export const BoxWithHandle: FC<IProps> = (props: IProps) => {
  const [{ opacity, isDragging }, drag, dragPreview] = useDrag({
    item: { id: props.item.id, type: 'TOOL' },
    collect: (monitor) => {
      return {
        isDragging: monitor.isDragging(),
        opacity: monitor.isDragging() ? 0.4 : 1,
      };
    },
  });
  const children = Array.isArray(props.children)
    ? props.children : [props.children];
  return (
    <div className='box-drag-handle-container' ref={dragPreview} style={{ opacity }}>
      <div className='box-drag-handle' ref={drag as any} >
        <Icon className='box-drag-handle-icon' name='drag-handle' />
      </div>
      {...children}
    </div>
  );
};
