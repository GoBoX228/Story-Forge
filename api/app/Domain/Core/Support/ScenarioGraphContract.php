<?php

namespace App\Domain\Core\Support;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ScenarioGraphContract
{
    public const NODE_TYPES = ['description', 'dialog', 'location', 'check', 'loot', 'combat'];

    public const TRANSITION_TYPES = ['linear', 'choice', 'success', 'failure'];

    public function normalizeNodeConfig(string $type, mixed $config): array
    {
        $this->validateNodeType($type);

        $config = $this->normalizeObject($config, 'config');
        $this->rejectUnknownKeys('config', $config, array_keys($this->nodeConfigRules($type)));
        $this->validatePayload($config, $this->nodeConfigRules($type), 'config');

        return $config;
    }

    public function normalizeTransitionCondition(string $type, mixed $condition): array
    {
        $this->validateTransitionType($type);

        $condition = $this->normalizeObject($condition, 'condition');

        if (in_array($type, ['success', 'failure'], true)) {
            $condition['outcome'] ??= $type;
        }

        $this->rejectUnknownKeys('condition', $condition, array_keys($this->transitionConditionRules($type)));
        $this->validatePayload($condition, $this->transitionConditionRules($type), 'condition');

        if (isset($condition['outcome']) && $condition['outcome'] !== $type) {
            throw ValidationException::withMessages([
                'condition.outcome' => 'Outcome должен совпадать с типом перехода.',
            ]);
        }

        return $condition;
    }

    public function normalizeTransitionMetadata(mixed $metadata): array
    {
        $metadata = $this->normalizeObject($metadata, 'metadata');
        $this->rejectUnknownKeys('metadata', $metadata, ['visual']);

        if (!array_key_exists('visual', $metadata)) {
            return $metadata;
        }

        if ($metadata['visual'] === null) {
            $metadata['visual'] = [];

            return $metadata;
        }

        if (!is_array($metadata['visual']) || array_is_list($metadata['visual'])) {
            throw ValidationException::withMessages([
                'metadata.visual' => 'Visual metadata РґРѕР»Р¶РЅР° Р±С‹С‚СЊ JSON-РѕР±СЉРµРєС‚РѕРј.',
            ]);
        }

        $this->rejectUnknownKeys('metadata.visual', $metadata['visual'], ['waypoints']);

        if (!array_key_exists('waypoints', $metadata['visual']) || $metadata['visual']['waypoints'] === null) {
            return $metadata;
        }

        if (!is_array($metadata['visual']['waypoints']) || !array_is_list($metadata['visual']['waypoints'])) {
            throw ValidationException::withMessages([
                'metadata.visual.waypoints' => 'Waypoints РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ JSON-РјР°СЃСЃРёРІРѕРј.',
            ]);
        }

        if (count($metadata['visual']['waypoints']) > 12) {
            throw ValidationException::withMessages([
                'metadata.visual.waypoints' => 'Waypoints РЅРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 12.',
            ]);
        }

        $waypoints = [];
        foreach ($metadata['visual']['waypoints'] as $index => $point) {
            if (!is_array($point) || array_is_list($point)) {
                throw ValidationException::withMessages([
                    "metadata.visual.waypoints.{$index}" => 'Waypoint РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ JSON-РѕР±СЉРµРєС‚РѕРј.',
                ]);
            }

            $this->rejectUnknownKeys("metadata.visual.waypoints.{$index}", $point, ['x', 'y']);

            if (!array_key_exists('x', $point) || !is_numeric($point['x'])) {
                throw ValidationException::withMessages([
                    "metadata.visual.waypoints.{$index}.x" => 'Waypoint x РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј.',
                ]);
            }

            if (!array_key_exists('y', $point) || !is_numeric($point['y'])) {
                throw ValidationException::withMessages([
                    "metadata.visual.waypoints.{$index}.y" => 'Waypoint y РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ С‡РёСЃР»РѕРј.',
                ]);
            }

            $waypoints[] = [
                'x' => (float) $point['x'],
                'y' => (float) $point['y'],
            ];
        }

        $metadata['visual']['waypoints'] = $waypoints;

        return $metadata;
    }

    public function validateNodeType(string $type): void
    {
        if (!in_array($type, self::NODE_TYPES, true)) {
            throw ValidationException::withMessages([
                'type' => 'Недопустимый тип узла сценария.',
            ]);
        }
    }

    public function validateTransitionType(string $type): void
    {
        if (!in_array($type, self::TRANSITION_TYPES, true)) {
            throw ValidationException::withMessages([
                'type' => 'Недопустимый тип перехода сценария.',
            ]);
        }
    }

    private function nodeConfigRules(string $type): array
    {
        return match ($type) {
            'description' => [
                'scene' => ['nullable', 'string', 'max:120'],
            ],
            'dialog' => [
                'speaker' => ['nullable', 'string', 'max:120'],
            ],
            'location' => [
                'map_hint' => ['nullable', 'string', 'max:120'],
            ],
            'check' => [
                'skill' => ['nullable', 'string', 'max:64'],
                'dc' => ['nullable', 'integer', 'min:1', 'max:40'],
            ],
            'loot' => [
                'item_hint' => ['nullable', 'string', 'max:120'],
            ],
            'combat' => [
                'encounter' => ['nullable', 'string', 'max:120'],
            ],
        };
    }

    private function transitionConditionRules(string $type): array
    {
        return match ($type) {
            'success', 'failure' => [
                'dc' => ['nullable', 'integer', 'min:1', 'max:40'],
                'outcome' => ['required', 'string', Rule::in(['success', 'failure'])],
            ],
            default => [],
        };
    }

    private function normalizeObject(mixed $value, string $field): array
    {
        if ($value === null) {
            return [];
        }

        if (!is_array($value) || ($value !== [] && array_is_list($value))) {
            throw ValidationException::withMessages([
                $field => 'Значение должно быть JSON-объектом.',
            ]);
        }

        return $value;
    }

    private function rejectUnknownKeys(string $field, array $payload, array $allowedKeys): void
    {
        $unknownKeys = array_values(array_diff(array_keys($payload), $allowedKeys));

        if ($unknownKeys === []) {
            return;
        }

        $messages = [];
        foreach ($unknownKeys as $key) {
            $messages["{$field}.{$key}"] = 'Поле не поддерживается для выбранного типа.';
        }

        throw ValidationException::withMessages($messages);
    }

    private function validatePayload(array $payload, array $rules, string $field): void
    {
        $validator = Validator::make($payload, $rules);

        if ($validator->fails()) {
            $messages = [];
            foreach ($validator->errors()->messages() as $key => $errors) {
                $messages["{$field}.{$key}"] = $errors;
            }

            throw ValidationException::withMessages($messages);
        }
    }
}
