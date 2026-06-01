import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getCountiesForState } from "./counties";
import { VENDOR_PRODUCT_TYPES } from "./productTypes";
import { VENDOR_COVERAGE_STATES } from "./states";
import {
  formatCoverageRowPreview,
  generateCoverageRows,
  summarizeCoverageRows,
  validateCoverageBlock,
  VENDOR_COVERAGE_MODES,
  VENDOR_COVERAGE_MODE_OPTIONS,
} from "./coverageBuilderUtils";

const DEFAULT_STATE = VENDOR_COVERAGE_STATES[0]?.code || "";

function toggleValue(values, value) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

export default function CoverageBuilder({ onRowsChange, onAddCoverageBlock }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [mode, setMode] = useState(VENDOR_COVERAGE_MODES.ENTIRE_STATE);
  const [counties, setCounties] = useState([]);
  const [zipText, setZipText] = useState("");
  const [market, setMarket] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("");
  const [productTypes, setProductTypes] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewBlocks, setPreviewBlocks] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [errors, setErrors] = useState([]);

  const availableCounties = useMemo(() => getCountiesForState(state), [state]);

  const currentBlock = useMemo(
    () => ({
      state,
      mode,
      counties,
      zips: zipText,
      market,
      radius_miles: radiusMiles,
      productTypes,
    }),
    [state, mode, counties, zipText, market, radiusMiles, productTypes],
  );

  const pendingRows = useMemo(() => generateCoverageRows(currentBlock), [currentBlock]);
  const pendingSummary = useMemo(() => summarizeCoverageRows(pendingRows), [pendingRows]);

  function handleStateChange(nextState) {
    setState(nextState);
    setCounties([]);
    setErrors([]);
  }

  function handleAddCoverageBlock() {
    const validation = validateCoverageBlock(currentBlock);

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const nextRows = generateCoverageRows(currentBlock);
    const allRows = [...previewRows, ...nextRows];
    const nextBlock = {
      id: `${Date.now()}-${previewBlocks.length}`,
      summary: summarizeCoverageRows(nextRows),
      rows: nextRows,
    };
    setPreviewRows(allRows);
    setPreviewBlocks((current) => [...current, nextBlock]);
    setErrors([]);
    onAddCoverageBlock?.(nextRows);
    onRowsChange?.(allRows);
  }

  return (
    <section aria-label="Coverage builder" className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>State</span>
          <Select
            aria-label="Coverage state"
            value={state}
            onChange={(event) => handleStateChange(event.target.value)}
          >
            {VENDOR_COVERAGE_STATES.map((coverageState) => (
              <option key={coverageState.code} value={coverageState.code}>
                {coverageState.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Coverage mode</span>
          <Select
            aria-label="Coverage mode"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
              setErrors([]);
            }}
          >
            {VENDOR_COVERAGE_MODE_OPTIONS.map((coverageMode) => (
              <option key={coverageMode.value} value={coverageMode.value}>
                {coverageMode.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {mode === VENDOR_COVERAGE_MODES.SELECTED_COUNTIES ? (
        <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Counties</legend>
          {availableCounties.length ? (
            <div className="grid max-h-48 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {availableCounties.map((county) => (
                <label key={county} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={counties.includes(county)}
                    onChange={() => setCounties((current) => toggleValue(current, county))}
                  />
                  <span>{county}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No counties are available for this state.</p>
          )}
        </fieldset>
      ) : null}

      {mode === VENDOR_COVERAGE_MODES.SELECTED_ZIPS ? (
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>ZIP codes</span>
          <Input
            aria-label="ZIP codes"
            value={zipText}
            onChange={(event) => setZipText(event.target.value)}
            placeholder="43215, 43212"
          />
        </label>
      ) : null}

      {mode === VENDOR_COVERAGE_MODES.MARKET_RADIUS ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Market</span>
            <Input
              aria-label="Market"
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              placeholder="Columbus"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Radius miles</span>
            <Input
              aria-label="Radius miles"
              type="number"
              min="0"
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(event.target.value)}
              placeholder="25"
            />
          </label>
        </div>
      ) : null}

      <fieldset className="space-y-2 rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Product types</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {VENDOR_PRODUCT_TYPES.map((productType) => (
            <label key={productType.slug} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={productTypes.includes(productType.slug)}
                onChange={() => setProductTypes((current) => toggleValue(current, productType.slug))}
              />
              <span>{productType.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {errors.length ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Coverage to add</h3>
          {pendingRows.length ? (
            <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {pendingSummary}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Complete this coverage selection to preview what will be added.</p>
          )}
        </div>

        <Button type="button" onClick={handleAddCoverageBlock}>
          Add coverage
        </Button>

        <div>
          <h3 className="text-sm font-semibold text-slate-800">Added coverage</h3>
          {previewBlocks.length ? (
            <div className="mt-2 space-y-3">
              <ul className="space-y-1 text-sm text-slate-700">
                {previewBlocks.map((block) => (
                  <li key={block.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    {block.summary}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                className="text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
                aria-expanded={detailsOpen}
              >
                {detailsOpen ? "Hide generated rows" : "View generated rows"}
              </button>
              {detailsOpen ? (
                <div className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-white p-3">
                  <ul className="space-y-1 text-sm text-slate-700">
                    {previewRows.map((row, index) => (
                      <li key={`${formatCoverageRowPreview(row)}-${index}`}>
                        {formatCoverageRowPreview(row)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No coverage added yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
