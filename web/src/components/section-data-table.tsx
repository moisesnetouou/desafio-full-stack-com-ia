import type { ComponentProps } from "react"
import { twMerge } from "tailwind-merge"

interface SectionDataTable extends ComponentProps<"div"> {
  data: Array<{
    key: string
    value: string
  }>
}

export function SectionDataTable({className, data, ...props}: SectionDataTable) {
  return(
    <div className={twMerge('overflow-hidden rounded-lg border border-zinc-700', className)} {...props}>
      <table className='w-full'>
        {data.map((item => {
          return(
            <tr key={item.key} className='border-b border-zinc-700 last:border-0'>
              <td className='p-3 text-sm font-medium text-zinc-400 bg-zinc-800/50 border-r border-zinc-700'>{item.key}</td>
              <td className='text-sm p-3 font-mono text-zinc-300'>{item.value}</td>
            </tr>
          )
        }))}
      </table>
    </div>
  )
}