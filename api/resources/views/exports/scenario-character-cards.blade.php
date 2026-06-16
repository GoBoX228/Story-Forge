<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Карточки персонажей - {{ $scenario->title }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

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

        .print-page:last-child {
            page-break-after: auto;
        }

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

        .character-card {
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
            margin-bottom: 2.2mm;
            border-top: .25mm solid #cbd5e1;
            border-bottom: .25mm solid #cbd5e1;
            display: table;
            width: 100%;
        }

        .card-meta span {
            display: table-cell;
            vertical-align: middle;
            color: #374151;
            font-size: 6.2pt;
            font-weight: 900;
            letter-spacing: .06em;
            text-transform: uppercase;
        }

        .card-meta span + span {
            text-align: right;
            color: var(--accent);
        }

        .portrait {
            height: 22mm;
            margin-bottom: 2.1mm;
            border: .3mm solid #cbd5e1;
            background: #f3f4f6;
            overflow: hidden;
        }

        .portrait img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .portrait-placeholder {
            width: 100%;
            height: 100%;
            display: table;
            color: #9ca3af;
            font-size: 5.6pt;
            font-weight: 900;
            letter-spacing: .12em;
            text-align: center;
            text-transform: uppercase;
        }

        .portrait-placeholder span {
            display: table-cell;
            vertical-align: middle;
        }

        .description {
            height: 12.5mm;
            margin: 0 0 2.1mm;
            overflow: hidden;
            color: #111827;
            font-size: 6.2pt;
            line-height: 1.28;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 5.8mm);
            gap: 1.05mm;
        }

        .stat {
            height: 5.8mm;
            padding: .75mm 1mm;
            border: .25mm solid #d1d5db;
            background: #f9fafb;
            overflow: hidden;
            display: table;
            width: 100%;
        }

        .stat__mark,
        .stat__label,
        .stat__value {
            display: table-cell;
            vertical-align: middle;
        }

        .stat__mark {
            width: 1.65mm;
        }

        .stat__mark::before {
            content: "";
            display: block;
            width: 1.15mm;
            height: 1.15mm;
            background: var(--accent);
        }

        .stat__label {
            color: #6b7280;
            font-size: 4.9pt;
            font-weight: 900;
            letter-spacing: .03em;
            text-transform: uppercase;
        }

        .stat__value {
            width: 7.5mm;
            color: #111827;
            font-size: 5.8pt;
            font-weight: 900;
            line-height: 1;
            text-align: right;
            white-space: nowrap;
        }

        .character-card--back {
            padding-top: 5mm;
        }

        .back-description {
            height: 27mm;
            margin-bottom: 2.4mm;
            overflow: hidden;
            color: #111827;
            font-size: 6.7pt;
            line-height: 1.34;
        }

        .section-title {
            margin: 0 0 1mm;
            color: #111827;
            font-size: 5.5pt;
            font-weight: 900;
            letter-spacing: .08em;
            text-transform: uppercase;
        }

        .inventory-summary {
            height: 6mm;
            margin-bottom: 1.5mm;
            padding: 1.15mm;
            border: .25mm solid #cbd5e1;
            background: #f9fafb;
            color: #111827;
            font-size: 5.8pt;
            font-weight: 900;
            letter-spacing: .03em;
            overflow: hidden;
            text-transform: uppercase;
        }

        .inventory-list {
            height: 22mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            list-style: none;
        }

        .inventory-list li {
            margin-bottom: .75mm;
            padding-bottom: .65mm;
            border-bottom: .2mm solid #e5e7eb;
            color: #374151;
            font-size: 5.7pt;
            line-height: 1.18;
        }

        .inventory-list strong {
            display: block;
            color: #111827;
            font-size: 6.1pt;
            font-weight: 900;
            line-height: 1.1;
            text-transform: uppercase;
        }

        .inventory-list span {
            color: #6b7280;
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
@if (count($characterCardsExport['cards']) === 0)
    <section class="print-page">
        <div class="empty-note">
            <span>В составе сценария нет персонажей для экспорта</span>
        </div>
    </section>
@else
    @foreach ($characterCardsExport['sheets'] as $sheet)
        <section class="print-page" data-sheet="{{ $sheet['number'] }}" data-side="front">
            <div class="cards-grid">
                @foreach ($sheet['frontSlots'] as $slotIndex => $card)
                    <div
                        class="card-slot {{ $card ? '' : 'card-slot--empty' }}"
                        data-card-side="front"
                        data-card-slot="{{ $slotIndex }}"
                        data-character-name="{{ $card['name'] ?? '' }}"
                    >
                        @if ($card)
                            <article class="character-card" style="--accent: {{ $card['accentColor'] }};">
                                <h2 class="card-title">{{ $card['name'] }}</h2>
                                <div class="card-meta">
                                    <span>{{ $card['role'] }}</span>
                                    <span>Персонаж</span>
                                </div>
                                <div class="portrait">
                                    @if ($card['portraitUrl'])
                                        <img src="{{ $card['portraitUrl'] }}" alt="{{ $card['name'] }}">
                                    @else
                                        <div class="portrait-placeholder"><span>Портрет не выбран</span></div>
                                    @endif
                                </div>
                                <p class="description">{{ $card['shortDescription'] ?: 'Описание пока не добавлено.' }}</p>
                                <div class="stats-grid">
                                    @forelse ($card['stats'] as $stat)
                                        <div class="stat">
                                            <span class="stat__mark"></span>
                                            <span class="stat__label">{{ $stat['label'] }}</span>
                                            <span class="stat__value">{{ $stat['displayValue'] ?? $stat['value'] }}</span>
                                        </div>
                                    @empty
                                        <div class="stat">
                                            <span class="stat__mark"></span>
                                            <span class="stat__label">Статы</span>
                                            <span class="stat__value">-</span>
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
                        data-character-name="{{ $card['name'] ?? '' }}"
                    >
                        @if ($card)
                            <article class="character-card character-card--back" style="--accent: {{ $card['accentColor'] }};">
                                <h2 class="card-title">{{ $card['name'] }}</h2>
                                <div class="card-meta">
                                    <span>{{ $card['role'] }}</span>
                                    <span>{{ $card['inventoryCount'] }} сл. · {{ number_format($card['inventoryWeight'], 1, ',', ' ') }} кг</span>
                                </div>
                                <h3 class="section-title">Описание</h3>
                                <div class="back-description">
                                    {{ $card['description'] ?: 'Описание пока не добавлено.' }}
                                </div>
                                <div class="inventory-summary">
                                    Инвентарь · {{ $card['inventoryCount'] }} слотов · {{ number_format($card['inventoryWeight'], 1, ',', ' ') }} кг
                                </div>
                                <ul class="inventory-list">
                                    @forelse (array_slice($card['inventory'], 0, 7) as $item)
                                        <li>
                                            <strong>{{ $item['name'] }}</strong>
                                            <span>{{ $item['type'] }} · {{ $item['rarity'] }} · {{ number_format($item['weight'], 1, ',', ' ') }} кг · {{ $item['value'] }}</span>
                                        </li>
                                    @empty
                                        <li><strong>Инвентарь пуст</strong><span>Предметы не добавлены.</span></li>
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
