'use client';
import { CapitolGame } from '@/components/capitol/game';
import { ElectionDataProvider } from '@/lib/live/context';
import './capitol.css';
export default function Capitol() {
  return (
    <ElectionDataProvider>
      <CapitolGame />
    </ElectionDataProvider>
  );
}
