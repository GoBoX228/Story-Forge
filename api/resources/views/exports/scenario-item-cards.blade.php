<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Карточки предметов - {{ $documentTitle }}</title>
    <style>
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #111827;
            background: #ffffff;
            font-family: DejaVu Sans, Arial, sans-serif;
        }
        .print-page {
            width: 210mm;
            height: 297mm;
            padding: 12.5mm 6.5mm;
            page-break-after: always;
            overflow: hidden;
        }
        .print-page:last-child { page-break-after: auto; }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(3, 63mm);
            grid-template-rows: repeat(3, 88mm);
            gap: 4mm;
            width: 197mm;
            height: 272mm;
        }
        .card-slot {
            width: 63mm;
            height: 88mm;
            position: relative;
        }
        .card-slot::before,
        .card-slot::after {
            content: "";
            position: absolute;
            pointer-events: none;
        }
        .card-slot::before {
            inset: -1.15mm;
            z-index: 20;
            border: .18mm dashed #cbd5e1;
        }
        .card-slot::after {
            inset: 0;
            z-index: 21;
            border: .35mm solid #111827;
        }
        .card-slot--empty::after {
            border-color: #e5e7eb;
            border-style: dashed;
        }
        .item-card {
            --accent: #4361ee;
            width: 100%;
            height: 100%;
            padding: 4mm 3.6mm 3.4mm 5.2mm;
            overflow: hidden;
            background: #ffffff;
            border-left: 2mm solid var(--accent);
        }
        .card-title {
            height: 13.8mm;
            margin: 0 0 1.8mm;
            overflow: hidden;
            color: #111827;
            font-size: 12pt;
            line-height: 1.03;
            font-weight: 900;
            letter-spacing: .015em;
            text-transform: uppercase;
        }
        .card-meta {
            height: 6mm;
            margin-bottom: 2.4mm;
            border-top: .25mm solid #cbd5e1;
            border-bottom: .25mm solid #cbd5e1;
            display: table;
            width: 100%;
        }
        .card-meta span {
            display: table-cell;
            vertical-align: middle;
            color: #374151;
            font-size: 6pt;
            font-weight: 900;
            letter-spacing: .05em;
            text-transform: uppercase;
        }
        .card-meta span + span {
            text-align: right;
            color: var(--accent);
        }
        .description {
            height: 28mm;
            margin: 0 0 2.4mm;
            overflow: hidden;
            color: #111827;
            font-size: 6.7pt;
            line-height: 1.34;
        }
        .item-facts {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.1mm;
            margin-bottom: 2.2mm;
        }
        .fact {
            height: 7mm;
            padding: 1mm;
            border: .25mm solid #d1d5db;
            background: #f9fafb;
            overflow: hidden;
        }
        .fact__label {
            color: #6b7280;
            font-size: 4.8pt;
            font-weight: 900;
            letter-spacing: .04em;
            text-transform: uppercase;
        }
        .fact__value {
            margin-top: .3mm;
            color: #111827;
            font-size: 7pt;
            font-weight: 900;
            line-height: 1;
            text-transform: uppercase;
        }
        .mod-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 5.8mm);
            gap: 1.05mm;
        }
        .mod-badge {
            height: 5.8mm;
            padding: .75mm 1mm;
            border: .25mm solid #d1d5db;
            background: #f9fafb;
            overflow: hidden;
            display: table;
            width: 100%;
        }
        .mod-badge__mark,
        .mod-badge__label,
        .mod-badge__value {
            display: table-cell;
            vertical-align: middle;
        }
        .mod-badge__mark { width: 1.65mm; }
        .mod-badge__mark::before {
            content: "";
            display: block;
            width: 1.15mm;
            height: 1.15mm;
            background: var(--accent);
        }
        .mod-badge__label {
            color: #6b7280;
            font-size: 4.8pt;
            font-weight: 900;
            letter-spacing: .03em;
            text-transform: uppercase;
        }
        .mod-badge__value {
            width: 7.5mm;
            color: #111827;
            font-size: 5.8pt;
            font-weight: 900;
            text-align: right;
            white-space: nowrap;
        }
        .section-title {
            margin: 0 0 1mm;
            color: #111827;
            font-size: 5.5pt;
            font-weight: 900;
            letter-spacing: .08em;
            text-transform: uppercase;
        }
        .back-description {
            height: 34mm;
            margin-bottom: 2.4mm;
            overflow: hidden;
            color: #111827;
            font-size: 6.7pt;
            line-height: 1.34;
        }
        .mod-list {
            height: 25mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            list-style: none;
        }
        .mod-list li {
            margin-bottom: .75mm;
            padding-bottom: .65mm;
            border-bottom: .2mm solid #e5e7eb;
            color: #374151;
            font-size: 5.7pt;
            line-height: 1.18;
        }
        .mod-list strong {
            color: #111827;
            font-size: 6pt;
            font-weight: 900;
            text-transform: uppercase;
        }
        .empty-note {
            display: table;
            width: 100%;
            height: 100%;
            border: .35mm dashed #d1d5db;
            color: #6b7280;
            text-align: center;
            font-size: 9pt;
            font-weight: 800;
            letter-spacing: .08em;
            text-transform: uppercase;
        }
        .empty-note span {
            display: table-cell;
            vertical-align: middle;
        }
    </style>
</head>
<body>
@if (count($itemCardsExport['cards']) === 0)
    <section class="print-page">
        <div class="empty-note">
            <span>В составе сценария нет предметов для экспорта</span>
        </div>
    </section>
@else
    @foreach ($itemCardsExport['sheets'] as $sheet)
        <section class="print-page" data-sheet="{{ $sheet['number'] }}" data-side="front">
            <div class="cards-grid">
                @foreach ($sheet['frontSlots'] as $slotIndex => $card)
                    <div
                        class="card-slot {{ $card ? '' : 'card-slot--empty' }}"
                        data-card-side="front"
                        data-card-slot="{{ $slotIndex }}"
                        data-item-name="{{ $card['name'] ?? '' }}"
                    >
                        @if ($card)
                            <article class="item-card" style="--accent: {{ $card['accentColor'] }};">
                                <h2 class="card-title">{{ $card['name'] }}</h2>
                                <div class="card-meta">
                                    <span>{{ $card['type'] }}</span>
                                    <span>{{ $card['rarity'] }}</span>
                                </div>
                                <p class="description">{{ $card['shortDescription'] ?: 'Описание пока не добавлено.' }}</p>
                                <div class="item-facts">
                                    <div class="fact">
                                        <div class="fact__label">Вес</div>
                                        <div class="fact__value">{{ number_format($card['weight'], 1, ',', ' ') }} кг</div>
                                    </div>
                                    <div class="fact">
                                        <div class="fact__label">Ценность</div>
                                        <div class="fact__value">{{ $card['value'] }}</div>
                                    </div>
                                </div>
                                <div class="mod-grid">
                                    @forelse ($card['modifiers'] as $modifier)
                                        <div class="mod-badge">
                                            <span class="mod-badge__mark"></span>
                                            <span class="mod-badge__label">{{ $modifier['label'] }}</span>
                                            <span class="mod-badge__value">{{ $modifier['value'] }}</span>
                                        </div>
                                    @empty
                                        <div class="mod-badge">
                                            <span class="mod-badge__mark"></span>
                                            <span class="mod-badge__label">Эффект</span>
                                            <span class="mod-badge__value">-</span>
                                        </div>
                                    @endforelse
                                </div>
                            </article>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>

        <section class="print-page" data-sheet="{{ $sheet['number'] }}" data-side="back">
            <div class="cards-grid">
                @foreach ($sheet['backSlots'] as $slotIndex => $card)
                    <div
                        class="card-slot {{ $card ? '' : 'card-slot--empty' }}"
                        data-card-side="back"
                        data-card-slot="{{ $slotIndex }}"
                        data-item-name="{{ $card['name'] ?? '' }}"
                    >
                        @if ($card)
                            <article class="item-card" style="--accent: {{ $card['accentColor'] }};">
                                <h2 class="card-title">{{ $card['name'] }}</h2>
                                <div class="card-meta">
                                    <span>{{ $card['type'] }}</span>
                                    <span>{{ number_format($card['weight'], 1, ',', ' ') }} кг · {{ $card['value'] }}</span>
                                </div>
                                <h3 class="section-title">Описание</h3>
                                <div class="back-description">
                                    {{ $card['description'] ?: 'Описание пока не добавлено.' }}
                                </div>
                                <h3 class="section-title">Модификаторы</h3>
                                <ul class="mod-list">
                                    @forelse ($card['modifiers'] as $modifier)
                                        <li><strong>{{ $modifier['label'] }}</strong> · {{ $modifier['value'] }}</li>
                                    @empty
                                        <li><strong>Нет модификаторов</strong> · Эффекты не добавлены.</li>
                                    @endforelse
                                </ul>
                            </article>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>
    @endforeach
@endif
</body>
</html>
