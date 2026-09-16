import React from 'react';

// Helper: count total subInvestments under any node by recursively summing
function countSubInvestments(node) {
  if (!node) return 0;
  // Leaf node with explicit subInvestments array
  if (Array.isArray(node.subInvestments)) return node.subInvestments.length;

  // Otherwise, find any array children and sum their counts recursively
  let total = 0;
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (Array.isArray(val)) {
      for (const child of val) {
        total += countSubInvestments(child);
      }
    }
  }
  return total;
}

const styles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '14px',
  },
  th: {
    border: '1px solid #d0d7de',
    padding: '10px 12px',
    background: '#f6f8fa',
    textAlign: 'left',
  },
  td: {
    border: '1px solid #e1e4e8',
    padding: '10px 12px',
    verticalAlign: 'middle',
  },
  small: { color: '#555', fontSize: '12px' },
};

export function HierarchicalTable({ data = [], visible = {}, aggregateLevel = 'sub_investment_name' }) {
  // Ensure the top-level is an array of Vidhansabha nodes
  const vidhansabhas = Array.isArray(data) ? data : [];

  const vis = visible || {};
  const showVidhansabhaFlag = vis.showVidhansabha !== false;
  const showVikasKhandFlag = vis.showVikasKhand !== false;
  const showKendraFlag = vis.showKendra !== false;
  const showYojanaFlag = vis.showYojana !== false;
  const showNiveshFlag = vis.showNivesh !== false;
  const showUpNiveshFlag = vis.showUpNivesh !== false;
  const showAllocatedFlag = vis.showAllocated !== false;
  const showFarmerFlag = vis.showFarmer !== false;
  const showSubsidyFlag = vis.showSubsidy !== false;
  const showTotalFlag = vis.showTotal !== false;

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Vidhansabha</th>
          <th style={styles.th}>Vikas Khand</th>
          <th style={styles.th}>Kendra</th>
          <th style={styles.th}>Yojana</th>
          <th style={styles.th}>Nivesh</th>
          <th style={styles.th}>Up-Nivesh</th>
        </tr>
      </thead>
      <tbody>
        {vidhansabhas.map((vidh, vIdx) => {
          const vRowSpan = Math.max(1, countSubInvestments(vidh));
          const vikasArray = Array.isArray(vidh.vikasKhands) ? vidh.vikasKhands : [];

          return vikasArray.map((vikas, vkIdx) => {
            const vkRowSpan = Math.max(1, countSubInvestments(vikas));
            const kendras = Array.isArray(vikas.kendras) ? vikas.kendras : [];

            return kendras.map((kendra, kIdx) => {
              const kRowSpan = Math.max(1, countSubInvestments(kendra));
              const yojanas = Array.isArray(kendra.yojanas) ? kendra.yojanas : [];

              return yojanas.map((yojana, yIdx) => {
                const yRowSpan = Math.max(1, countSubInvestments(yojana));
                const niveshs = Array.isArray(yojana.niveshs) ? yojana.niveshs : [];

                return niveshs.map((nivesh, nIdx) => {
                  const nRowSpan = Math.max(1, countSubInvestments(nivesh));
                  const subs = Array.isArray(nivesh.subInvestments) ? nivesh.subInvestments : [];

                  return subs.map((sub, sIdx) => {
                    // Conditions for showing parent cell only on its first appearance
                    const showVidh = vkIdx === 0 && kIdx === 0 && yIdx === 0 && nIdx === 0 && sIdx === 0;
                    const showVikas = kIdx === 0 && yIdx === 0 && nIdx === 0 && sIdx === 0;
                    const showKendra = yIdx === 0 && nIdx === 0 && sIdx === 0;
                    const showYojana = nIdx === 0 && sIdx === 0;
                    const showNivesh = sIdx === 0;

                    return (
                      <tr key={`r-${vIdx}-${vkIdx}-${kIdx}-${yIdx}-${nIdx}-${sIdx}`}>
                            {showVidh && showVidhansabhaFlag && (
                              <td style={styles.td} rowSpan={vRowSpan}>
                                <strong>{vidh.name}</strong>
                              </td>
                            )}

                        {showVikas && showVikasKhandFlag && (
                          <td style={styles.td} rowSpan={vkRowSpan}>
                            {vikas.name}
                          </td>
                        )}

                        {showKendra && showKendraFlag && (
                          <td style={styles.td} rowSpan={kRowSpan}>
                            {kendra.name}
                          </td>
                        )}

                        {showYojana && showYojanaFlag && (
                          <td style={styles.td} rowSpan={yRowSpan}>
                            {yojana.name}
                          </td>
                        )}

                        {showNivesh && showNiveshFlag && (
                          <td style={styles.td} rowSpan={nRowSpan}>
                            {nivesh.name}
                          </td>
                        )}

                        {showUpNiveshFlag && (
                          <td style={styles.td}>
                            <div>{sub.name}</div>
                          </td>
                        )}
                        {(() => {
                          // Determine which node's aggregates to show on this row
                          let agg = null;
                          if (aggregateLevel === 'sub_investment_name') {
                            agg = {
                              allocated_quantity: sub.allocated_quantity,
                              amount_of_farmer_share: sub.amount_of_farmer_share,
                              amount_of_subsidy: sub.amount_of_subsidy,
                              total_amount: sub.total_amount,
                            };
                          } else if (aggregateLevel === 'investment_name' && showNivesh) {
                            agg = nivesh.aggregates || null;
                          } else if (aggregateLevel === 'scheme_name' && showYojana) {
                            agg = yojana.aggregates || null;
                          } else if (aggregateLevel === 'center_name' && showKendra) {
                            agg = kendra.aggregates || null;
                          } else if (aggregateLevel === 'vikas_khand_name' && showVikas) {
                            agg = vikas.aggregates || null;
                          } else if (aggregateLevel === 'vidhan_sabha_name' && showVidh) {
                            agg = vidh.aggregates || null;
                          }

                          return (
                            <>
                              {showAllocatedFlag && (
                                <td style={styles.td}>{agg && agg.allocated_quantity !== undefined ? agg.allocated_quantity : ''}</td>
                              )}
                              {showFarmerFlag && (
                                <td style={styles.td}>{agg && agg.amount_of_farmer_share !== undefined ? `₹ ${agg.amount_of_farmer_share.toLocaleString()}` : ''}</td>
                              )}
                              {showSubsidyFlag && (
                                <td style={styles.td}>{agg && agg.amount_of_subsidy !== undefined ? `₹ ${agg.amount_of_subsidy.toLocaleString()}` : ''}</td>
                              )}
                              {showTotalFlag && (
                                <td style={styles.td}>{agg && agg.total_amount !== undefined ? `₹ ${agg.total_amount.toLocaleString()}` : ''}</td>
                              )}
                            </>
                          );
                        })()}
                      </tr>
                    );
                  });
                });
              });
            });
          });
        })}
      </tbody>
    </table>
  );
}

// Render only row elements (no table wrapper). Useful for embedding under
// an existing table that already contains headers and CSS (e.g., the summary table).
export function HierarchicalTableRows({ data = [], visible = {}, aggregateLevel = 'sub_investment_name', startLevel = 'vidhan_sabha_name', numericLevel = null }) {
  const topNodes = Array.isArray(data) ? data : [];
  const vis = visible || {};

  const showFlags = {
    vidhan_sabha_name: vis.showVidhansabha !== false,
    vikas_khand_name: vis.showVikasKhand !== false,
    center_name: vis.showKendra !== false,
    scheme_name: vis.showYojana !== false,
    investment_name: vis.showNivesh !== false,
    sub_investment_name: vis.showUpNivesh !== false,
  };

  const showAllocatedFlag = vis.showAllocated !== false;
  const showFarmerFlag = vis.showFarmer !== false;
  const showSubsidyFlag = vis.showSubsidy !== false;
  const showTotalFlag = vis.showTotal !== false;
  const showIkaiFlag = vis.showIkai !== false;

  const allLevels = ['vidhan_sabha_name','vikas_khand_name','center_name','scheme_name','investment_name','sub_investment_name'];
  const startIndex = Math.max(0, allLevels.indexOf(startLevel));
  const levels = allLevels.slice(startIndex);

  // Flatten hierarchy into leaf rows with path and node references
  const flat = [];

  const traverse = (nodes, levelIdx, nodesRef = [], path = []) => {
    nodes.forEach((node) => {
      const newNodesRef = [...nodesRef, node];
      const newPath = [...path, node.name];

      // If this is the last declared level
      if (levelIdx === levels.length - 1) {
        // If node has subInvestments, push a row per sub
        if (Array.isArray(node.subInvestments) && node.subInvestments.length > 0) {
          node.subInvestments.forEach((sub) => {
            flat.push({ path: newPath, nodesRef: newNodesRef, sub });
          });
        } else {
          // No subInvestments: push a single representative row for this node
          flat.push({ path: newPath, nodesRef: newNodesRef, sub: null });
        }
      } else {
        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children, levelIdx + 1, newNodesRef, newPath);
        } else {
          // If missing deeper children but the node has subInvestments, treat similarly
          if (Array.isArray(node.subInvestments) && node.subInvestments.length > 0) {
            node.subInvestments.forEach((sub) => {
              flat.push({ path: newPath, nodesRef: newNodesRef, sub });
            });
          } else {
            flat.push({ path: newPath, nodesRef: newNodesRef, sub: null });
          }
        }
      }
    });
  };

  traverse(topNodes, 0, [], []);

  // Helper to compute rowspan for a level at a given row index
  const computeRowSpan = (rowIndex, levelIdx) => {
    const base = flat[rowIndex].path.slice(0, levelIdx + 1).join('|');
    let count = 0;
    for (let k = rowIndex; k < flat.length; k++) {
      const candidate = flat[k].path.slice(0, levelIdx + 1).join('|');
      if (candidate === base) count++; else break;
    }
    return Math.max(1, count);
  };

  const rows = flat.map((r, idx) => {
    const cells = [];

    // For each level, render a TD only when this is the first row of that group's block
    for (let li = 0; li < levels.length; li++) {
      const levelKey = levels[li];
      const flag = showFlags[levelKey];
      if (!flag) continue;

      // simpler prefix check: compare concatenated prefix up to this level
      const currPrefix = r.path.slice(0, li + 1).join('|');
      const prevPrefix = idx > 0 ? flat[idx - 1].path.slice(0, li + 1).join('|') : null;
      const isFirst = idx === 0 || prevPrefix !== currPrefix;
      if (isFirst) {
        const rowSpan = computeRowSpan(idx, li);
        cells.push(
          <td key={`c-${idx}-${li}`} style={styles.td} rowSpan={rowSpan}>
            {li === 0 ? <strong>{r.path[li]}</strong> : r.path[li]}
          </td>
        );
      }
    }

    // Determine which level should be used to display numeric aggregates
    const numericLevelToUse = numericLevel || aggregateLevel;
    const numAggIndex = levels.indexOf(numericLevelToUse);
    let numAgg = null;
    if (numericLevelToUse === 'sub_investment_name') {
      numAgg = r.sub || null;
    } else if (numAggIndex >= 0) {
      const nodeRef = r.nodesRef[numAggIndex];
      if (nodeRef) numAgg = nodeRef.aggregates || null;
    }

    // Show numeric cells only on the row where the numeric-level cell is rendered
    const numericShownOnThisRow = (numAggIndex >= 0) ? (idx === 0 ? true : flat[idx - 1].path.slice(0, numAggIndex + 1).join('|') !== r.path.slice(0, numAggIndex + 1).join('|')) : (numericLevelToUse === 'sub_investment_name');

    // Add ikai (unit) column for sub-investment level
    if (showIkaiFlag && r.sub) {
      cells.push(<td key={`ikai-${idx}`} style={styles.td}>{r.sub.unit || ''}</td>);
    }

    if (showAllocatedFlag) cells.push(<td key={`alloc-${idx}`} style={styles.td}>{numericShownOnThisRow && numAgg && numAgg.allocated_quantity !== undefined ? numAgg.allocated_quantity : ''}</td>);
    if (showFarmerFlag) cells.push(<td key={`farmer-${idx}`} style={styles.td}>{numericShownOnThisRow && numAgg && numAgg.amount_of_farmer_share !== undefined ? `₹ ${numAgg.amount_of_farmer_share.toLocaleString()}` : ''}</td>);
    if (showSubsidyFlag) cells.push(<td key={`sub-${idx}`} style={styles.td}>{numericShownOnThisRow && numAgg && numAgg.amount_of_subsidy !== undefined ? `₹ ${numAgg.amount_of_subsidy.toLocaleString()}` : ''}</td>);
    if (showTotalFlag) cells.push(<td key={`tot-${idx}`} style={styles.td}>{numericShownOnThisRow && numAgg && numAgg.total_amount !== undefined ? `₹ ${numAgg.total_amount.toLocaleString()}` : ''}</td>);

    return (<tr key={`r-${idx}`}>{cells}</tr>);
  });

  return rows;
}

// Demo sample data and convenience demo component for quick viewing
const sampleData = [
  {
    name: 'Vidhansabha A',
    vikasKhands: [
      {
        name: 'Vikas Khand 1',
        kendras: [
          {
            name: 'Kendra I',
            yojanas: [
              {
                name: 'Yojana Alpha',
                niveshs: [
                  {
                    name: 'Nivesh 1',
                    subInvestments: [
                      { name: 'Up-Nivesh A', allocated_quantity: 10, amount_of_farmer_share: 80000, amount_of_subsidy: 20000, total_amount: 100000 },
                      { name: 'Up-Nivesh B', allocated_quantity: 5, amount_of_farmer_share: 40000, amount_of_subsidy: 10000, total_amount: 50000 },
                    ],
                  },
                  {
                    name: 'Nivesh 2',
                    subInvestments: [{ name: 'Up-Nivesh C', allocated_quantity: 8, amount_of_farmer_share: 60000, amount_of_subsidy: 15000, total_amount: 75000 }],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Vikas Khand 2',
        kendras: [
          {
            name: 'Kendra II',
            yojanas: [
              {
                name: 'Yojana Beta',
                niveshs: [
                  {
                    name: 'Nivesh 3',
                    subInvestments: [{ name: 'Up-Nivesh D', allocated_quantity: 2, amount_of_farmer_share: 16000, amount_of_subsidy: 4000, total_amount: 20000 }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Vidhansabha B',
    vikasKhands: [
      {
        name: 'Vikas Khand 3',
        kendras: [
          {
            name: 'Kendra III',
            yojanas: [
              {
                name: 'Yojana Gamma',
                niveshs: [
                  {
                    name: 'Nivesh 4',
                    subInvestments: [{ name: 'Up-Nivesh E', allocated_quantity: 3, amount_of_farmer_share: 24000, amount_of_subsidy: 6000, total_amount: 30000 }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function HierarchicalTableDemo() {
  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Hierarchical Table Demo</h3>
      <HierarchicalTable data={sampleData} />
    </div>
  );
}

export default HierarchicalTableDemo;
