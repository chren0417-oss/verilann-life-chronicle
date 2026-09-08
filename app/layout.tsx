import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'维尔兰 · 人生之书',description:'在原创中世纪西幻大陆，书写并保存自己的一生。'};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
