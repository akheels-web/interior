'use client';
import { Check } from 'lucide-react';
import {
  ACCENT_COLORS,
  ARM_STYLES,
  BRAND_PRESETS,
  CEILING_STYLES,
  FABRIC_STYLES,
  FRONT_STYLES,
  LEG_STYLES,
  LIGHT_TEMPS,
  SOFA_SHAPES,
  SWITCH_COLORS,
  SWITCH_GANGS,
  SWITCH_PLATES,
  TOP_SHAPES,
  WALL_TEXTURES,
  getBrandsForKind,
  getItemPrice,
  type Item,
  type Kind,
  type Room,
} from './model';

export function SofaControls({ item, onChange }: { item: Item; onChange: (patch: Partial<Item>) => void }) {
  const isSofa = item.kind === 'sofa';
  const currentCushions = item.cushionCount ?? (item.kind === 'armchair' ? 1 : item.sofaType === 'two-seater' ? 2 : item.sofaType === 'four-seater' || item.sofaType === 'u-shape' ? 4 : 3);
  return (
    <div className="sofa-controls">
      {isSofa && (
        <fieldset className="sofa-shape-field">
          <legend>Sofa shape</legend>
          <div className="sofa-shape-grid">
            {SOFA_SHAPES.map(shape => (
              <button
                key={shape.value}
                type="button"
                className={(item.sofaType ?? 'three-seater') === shape.value ? 'selected' : ''}
                aria-pressed={(item.sofaType ?? 'three-seater') === shape.value}
                title={shape.note}
                onClick={() => onChange({ sofaType: shape.value })}
              >
                <span className={`sofa-shape-drawing sofa-shape-${shape.value}`} style={{ backgroundColor: item.color }}>
                  <i />
                  <i />
                  <i />
                </span>
                <span>{shape.label}</span>
                {(item.sofaType ?? 'three-seater') === shape.value && <Check size={12} />}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className="fabric-field">
        <legend>Cloth texture</legend>
        <div className="fabric-options">
          {FABRIC_STYLES.map(fabric => (
            <button
              key={fabric.value}
              type="button"
              className={(item.fabric ?? 'plain') === fabric.value ? 'selected' : ''}
              aria-pressed={(item.fabric ?? 'plain') === fabric.value}
              onClick={() => onChange({ fabric: fabric.value })}
            >
              <span className={`fabric-sample fabric-${fabric.value}`} style={{ backgroundColor: item.color }} />
              <span>{fabric.label}</span>
              {(item.fabric ?? 'plain') === fabric.value && <Check size={10} />}
            </button>
          ))}
        </div>
      </fieldset>
      {(item.kind === 'sofa' || item.kind === 'armchair') && (
        <div className="two-col">
          <label className="field">
            <span>Arm &amp; back silhouette</span>
            <select value={item.armStyle ?? 'track'} onChange={e => onChange({ armStyle: e.target.value as Item['armStyle'] })}>
              {ARM_STYLES.map(a => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Base &amp; leg style</span>
            <select value={item.legStyle ?? 'tapered-wood'} onChange={e => onChange({ legStyle: e.target.value as Item['legStyle'] })}>
              {LEG_STYLES.map(l => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {isSofa && (
        <label className="field">
          <div className="between">
            <span>Seat cushion divisions</span>
            <strong>{currentCushions} cushions</strong>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={currentCushions}
            onChange={e => onChange({ cushionCount: Number(e.target.value) })}
          />
        </label>
      )}
      <p className="helper-text">Shape, arm silhouette, legs, and cloth weave are independent of colour and material. Use Transform to set exact size.</p>
    </div>
  );
}

export function SwitchControls({ item, onChange }: { item: Item; onChange: (patch: Partial<Item>) => void }) {
  return (
    <div className="switch-controls">
      <fieldset className="fabric-field">
        <legend>Modular gang configuration</legend>
        <div className="chip-grid">
          {SWITCH_GANGS.map(g => (
            <button
              key={g.value}
              type="button"
              className={`chip-btn ${(item.switchGang ?? '4M') === g.value ? 'selected' : ''}`}
              aria-pressed={(item.switchGang ?? '4M') === g.value}
              title={g.note}
              onClick={() => onChange({ switchGang: g.value })}
            >
              <strong>{g.label}</strong>
              <small>{g.note}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Cover plate finish</span>
        <select value={item.switchPlate ?? 'matte'} onChange={e => onChange({ switchPlate: e.target.value as Item['switchPlate'] })}>
          {SWITCH_PLATES.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span>Switchplate colour presets</span>
        <div className="swatches">
          {SWITCH_COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              className={`swatch ${item.color.toLowerCase() === c.hex.toLowerCase() ? 'selected' : ''}`}
              style={{ background: c.hex }}
              onClick={() => onChange({ color: c.hex })}
              aria-label={`Switch colour ${c.name}`}
              title={c.name}
            >
              {item.color.toLowerCase() === c.hex.toLowerCase() && <Check size={12} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BrandAndSpecControls({ item, onChange }: { item: Item; onChange: (patch: Partial<Item>) => void }) {
  const presets = getBrandsForKind(item.kind);
  const currentBrand = item.brand ?? presets[0]?.brand ?? '';
  const matchedBrand = presets.find(b => b.brand === currentBrand);
  const showTableTop = ['coffee-table', 'dining-table', 'desk', 'side-table'].includes(item.kind);
  const showFrontStyle = ['wardrobe', 'tv-unit', 'kitchen-cabinet', 'kitchen-sink', 'vanity'].includes(item.kind);
  const showLightTemp = ['floor-lamp', 'pendant', 'wall-light', 'ceiling-light', 'spotlight', 'tube-light', 'cfl'].includes(item.kind);
  const accentLabel =
    item.kind === 'socket'
      ? 'Rocker & trim accent'
      : ['sofa', 'armchair', 'bed', 'single-bed', 'dining-chair'].includes(item.kind)
        ? 'Cushion & trim accent'
        : ['kitchen-cabinet', 'kitchen-sink', 'vanity'].includes(item.kind)
          ? 'Countertop & hardware finish'
          : 'Hardware / secondary finish';

  return (
    <div className="brand-spec-controls">
      <div className="two-col">
        <label className="field">
          <span>Brand / Manufacturer</span>
          <select
            value={matchedBrand ? matchedBrand.brand : '__custom__'}
            onChange={e => {
              if (e.target.value === '__custom__') return;
              const nextBrand = presets.find(p => p.brand === e.target.value);
              onChange({ brand: e.target.value, modelCode: nextBrand?.series[0] ?? item.modelCode });
            }}
          >
            {presets.map(p => (
              <option key={p.brand} value={p.brand}>
                {p.brand}
              </option>
            ))}
            <option value="__custom__">Custom Brand…</option>
          </select>
        </label>
        <label className="field">
          <span>Series / Collection</span>
          {matchedBrand ? (
            <select
              value={matchedBrand.series.includes(item.modelCode ?? '') ? item.modelCode : matchedBrand.series[0]}
              onChange={e => onChange({ brand: matchedBrand.brand, modelCode: e.target.value })}
            >
              {matchedBrand.series.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={item.modelCode ?? ''}
              placeholder="e.g. Arteor / Custom SKU"
              onChange={e => onChange({ modelCode: e.target.value })}
            />
          )}
        </label>
      </div>
      <div className="two-col">
        <label className="field">
          <span>Custom Brand / Vendor</span>
          <input
            value={item.brand ?? ''}
            placeholder={presets[0]?.brand ?? 'Brand name'}
            onChange={e => onChange({ brand: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Model / SKU Code</span>
          <input
            value={item.modelCode ?? ''}
            placeholder={presets[0]?.series[0] ?? 'Series or SKU'}
            onChange={e => onChange({ modelCode: e.target.value })}
          />
        </label>
      </div>

      {showTableTop && (
        <label className="field">
          <span>Tabletop geometry</span>
          <select value={item.topShape ?? 'rectangular'} onChange={e => onChange({ topShape: e.target.value as Item['topShape'] })}>
            {TOP_SHAPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {showFrontStyle && (
        <label className="field">
          <span>Shutter &amp; door profile</span>
          <select value={item.frontStyle ?? 'sleek-handleless'} onChange={e => onChange({ frontStyle: e.target.value as Item['frontStyle'] })}>
            {FRONT_STYLES.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {showLightTemp && (
        <fieldset className="fabric-field">
          <legend>Colour temperature (Kelvin)</legend>
          <div className="chip-grid">
            {LIGHT_TEMPS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`chip-btn ${(item.lightTemp ?? '3000K') === t.id ? 'selected' : ''}`}
                aria-pressed={(item.lightTemp ?? '3000K') === t.id}
                onClick={() => onChange({ lightTemp: t.id })}
              >
                <span className="temp-dot" style={{ background: t.hex }} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="field">
        <div className="between">
          <span>{accentLabel}</span>
          <input
            type="color"
            aria-label={accentLabel}
            value={item.accentColor ?? '#c5a059'}
            onChange={e => onChange({ accentColor: e.target.value })}
          />
        </div>
        <div className="swatches">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              className={`swatch ${(item.accentColor ?? '').toLowerCase() === c.hex.toLowerCase() ? 'selected' : ''}`}
              style={{ background: c.hex }}
              onClick={() => onChange({ accentColor: c.hex })}
              aria-label={`${accentLabel} ${c.name}`}
              title={c.name}
            >
              {(item.accentColor ?? '').toLowerCase() === c.hex.toLowerCase() && <Check size={12} />}
            </button>
          ))}
        </div>
      </div>

      <div className="two-col">
        <label className="field">
          <span>Unit Estimate (₹ INR)</span>
          <input
            type="number"
            min={0}
            step={500}
            value={getItemPrice(item)}
            onChange={e => onChange({ unitPrice: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
        <label className="field">
          <span>Designer Spec Note</span>
          <input
            value={item.specNote ?? ''}
            placeholder="e.g. Italian stain-guard, 16A twin module"
            onChange={e => onChange({ specNote: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

export function WallTextureControl({ room, onChange }: { room: Room; onChange: (patch: Partial<Room>) => void }) {
  const current = WALL_TEXTURES.find(texture => texture.value === (room.wallTexture ?? 'paint')) ?? WALL_TEXTURES[0];
  const wallBrands = BRAND_PRESETS['wall-paint'];
  return (
    <div className="wall-texture-control">
      <label className="field">
        <span>Wall texture</span>
        <select value={room.wallTexture ?? 'paint'} onChange={event => onChange({ wallTexture: event.target.value as Room['wallTexture'] })}>
          {WALL_TEXTURES.map(texture => (
            <option key={texture.value} value={texture.value}>
              {texture.name}
            </option>
          ))}
        </select>
      </label>
      <div className="wall-texture-preview">
        <span className={`wall-texture-sample wall-texture-${current.value}`} style={{ backgroundColor: room.wallColor }} />
        <span>
          <strong>{current.name}</strong>
          <small>{current.note}</small>
        </span>
      </div>
      <div className="two-col">
        <label className="field">
          <span>Wall Finish Brand</span>
          <select
            value={room.wallBrand ?? wallBrands[0].brand}
            onChange={e => onChange({ wallBrand: e.target.value })}
          >
            {wallBrands.map(b => (
              <option key={b.brand} value={`${b.brand} — ${b.series[0]}`}>
                {b.brand} ({b.series[0]})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ceiling Architecture</span>
          <select
            value={room.ceilingStyle ?? 'flat'}
            onChange={e => onChange({ ceilingStyle: e.target.value as Room['ceilingStyle'] })}
          >
            {CEILING_STYLES.map(c => (
              <option key={c.value} value={c.value}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="two-col">
        <label className="field">
          <span>Feature / Accent Wall</span>
          <select
            value={room.accentWallEdge === null || room.accentWallEdge === undefined ? 'none' : String(room.accentWallEdge)}
            onChange={e =>
              onChange({
                accentWallEdge: e.target.value === 'none' ? null : Number(e.target.value),
                accentWallColor: room.accentWallColor ?? '#6d7b6f',
              })
            }
          >
            <option value="none">Uniform Walls (None)</option>
            {room.points.map((_, idx) => (
              <option key={idx} value={String(idx)}>
                Wall {idx + 1}
              </option>
            ))}
          </select>
        </label>
        {room.accentWallEdge !== null && room.accentWallEdge !== undefined && (
          <label className="field">
            <div className="between">
              <span>Accent Wall Shade</span>
              <input
                type="color"
                aria-label="Accent Wall Shade"
                value={room.accentWallColor ?? '#6d7b6f'}
                onChange={e => onChange({ accentWallColor: e.target.value })}
              />
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

export function AdditionalAssetPreview({ kind, color }: { kind: Kind; color: string }) {
  if (kind === 'wall-art')
    return (
      <svg className="catalog-preview" viewBox="0 0 118 88" aria-hidden="true">
        <ellipse cx="59" cy="75" rx="35" ry="4" fill="#24332d" opacity=".06" />
        <rect x="22" y="15" width="75" height="55" fill={color} />
        <rect x="27" y="20" width="65" height="45" fill="#ebe5d5" />
        <path d="M34 57V40q11-26 24 0v17" fill="#9baa8c" />
        <path d="M55 57V37q12-20 24 0v20" fill="#bd9d7e" />
        <circle cx="75" cy="31" r="7" fill="#d5c797" />
        <path d="M32 57h53" stroke="#7e8f73" />
      </svg>
    );
  if (kind === 'tube-light')
    return (
      <svg className="catalog-preview" viewBox="0 0 118 88" aria-hidden="true">
        <path d="M17 38h85v15H17z" fill={color} stroke="#c8d0c4" />
        <rect x="21" y="41" width="77" height="9" rx="4" fill="#fbf9e7" />
        <path d="M22 41v9M97 41v9" stroke="#acb9aa" strokeWidth="2" />
      </svg>
    );
  if (kind === 'cfl')
    return (
      <svg className="catalog-preview" viewBox="0 0 118 88" aria-hidden="true">
        <path d="M49 49V26q0-9 8-9t8 9v20M58 48V27q0-9 8-9t8 9v22" fill="none" stroke={color} strokeWidth="7" />
        <path d="M48 48h28l-5 11H53z" fill="#d3d9cc" />
        <rect x="54" y="58" width="16" height="15" rx="2" fill="#a2aea0" />
        <path d="M54 62h16M54 67h16" stroke="#7f8b7c" />
      </svg>
    );
  return null;
}
