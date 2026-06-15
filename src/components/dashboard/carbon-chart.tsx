'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
const data=[{name:'Structure',kg:-3200},{name:'Envelope',kg:-940},{name:'Hardware',kg:510},{name:'MEP',kg:870},{name:'Finishes',kg:-420}];
export function CarbonChart(){return <ResponsiveContainer width="100%" height={260}><BarChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="kg" fill="#2b6f4e" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>}
