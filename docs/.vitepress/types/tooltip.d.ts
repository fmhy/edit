/**
 *  All Rights Reserved
 *
 *  Copyright (c) 2025 taskylizard
 *
 *  All rights reserved. This code and its associated files may not be copied, modified, distributed, sublicensed, or used in any form, in whole or in part, without prior written permission from the copyright holder.
 */
declare module 'virtual:tooltips' {
  export interface TooltipData {
    id: string
    title: string
    content: string
  }

  export const tooltips: TooltipData[]
  export function getTooltip(id: string): TooltipData | undefined
}