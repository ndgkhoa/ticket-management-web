import { forwardRef, memo } from 'react';
import { Tooltip as AntTooltip, type TooltipProps } from 'antd';
import type { Ref } from 'react';
import type { TooltipRef } from 'antd/es/tooltip';

export const Tooltip = memo(
  forwardRef((props: TooltipProps, ref: Ref<TooltipRef>) => {
    const tooltipProps: TooltipProps = {
      destroyOnHidden: true,
      ...props,
    };
    return <AntTooltip ref={ref} {...tooltipProps} />;
  })
);
