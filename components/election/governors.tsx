'use client';
import { useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import data from '@/lib/election/governors.json';
import { Choice } from './races';
export function Governors() {
  const [filter, setFilter] = useState('all');
  const rows = data.races
    .filter(
      (r) =>
        filter === 'all' ||
        (filter === 'open' && r.openSeat) ||
        (filter === 'close' &&
          ['Toss-up', 'Lean D', 'Lean R'].includes(r.rating)) ||
        filter === r.heldParty,
    )
    .sort((a, b) => a.stateName.localeCompare(b.stateName));
  return (
    <section id="governors" className="section-block">
      <div className="section-title">
        <div>
          <p className="eyebrow">Beyond Congress</p>
          <h2>36 states choose their executive.</h2>
        </div>
        <a href="/data/governors.json" download className="outline-button">
          <Download size={15} />
          Governor data
        </a>
      </div>
      <div className="governor-overview">
        <div>
          <strong>18</strong>
          <span>Democratic-held seats up</span>
        </div>
        <div>
          <strong>18</strong>
          <span>Republican-held seats up</span>
        </div>
        <div>
          <strong>18</strong>
          <span>Open contests</span>
        </div>
        <p>
          Governorships are separate executive offices. A national party tally
          does not create a national governing majority. This companion provides
          a roster and dated expert ratings, with no simulated governor
          probabilities.
        </p>
      </div>
      <div className="panel table-panel">
        <div className="section-top">
          <div>
            <h3>State gubernatorial election ledger</h3>
            <p className="muted">
              Cook rates Georgia, Nevada, Ohio and Wisconsin Toss-up in its
              August 27 snapshot.
            </p>
          </div>
          <Choice
            label="Filter governor races"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All 36 states' },
              { value: 'close', label: 'Toss-up / lean' },
              { value: 'open', label: 'Open contests' },
              { value: 'D', label: 'D-held seats' },
              { value: 'R', label: 'R-held seats' },
            ]}
          />
        </div>
        <div className="governor-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Current governor</TableHead>
                <TableHead>Party held</TableHead>
                <TableHead>2026 seat status</TableHead>
                <TableHead>Cook rating · Aug 27</TableHead>
                <TableHead>Term</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <strong>{r.stateName}</strong>
                  </TableCell>
                  <TableCell>{r.currentGovernor}</TableCell>
                  <TableCell>
                    <span
                      className={`party-token ${r.heldParty === 'D' ? 'dem-token' : 'rep-token'}`}
                    >
                      {r.heldParty}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.openSeat
                      ? 'Open contest'
                      : 'Incumbent seeking reelection'}
                    <small className="row-meta">
                      {r.incumbentStatus.replaceAll('-', ' ')}
                    </small>
                  </TableCell>
                  <TableCell>{r.rating}</TableCell>
                  <TableCell>{r.termYears} years</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="footnote">
          Current governors identify officeholders, not a general-election
          candidate list. New Hampshire and Vermont use two-year terms. Three
          territorial contests (Guam, Northern Mariana Islands, U.S. Virgin
          Islands) are documented separately in the download and excluded from
          the 36-state count. Ratings are qualitative, dated, and independent of
          the congressional simulation.
        </p>
        <div className="governor-sources">
          <a
            className="source-link"
            href="https://www.nga.org/governors/elections/"
            target="_blank"
            rel="noreferrer"
          >
            National Governors Association <ArrowUpRight size={14} />
          </a>
          <a
            className="source-link"
            href="https://www.cookpolitical.com/ratings/governor-race-ratings"
            target="_blank"
            rel="noreferrer"
          >
            Original Cook ratings <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
