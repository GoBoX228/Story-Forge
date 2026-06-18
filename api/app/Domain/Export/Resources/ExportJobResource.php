<?php

namespace App\Domain\Export\Resources;

use App\Models\ExportJob;
use Illuminate\Http\Resources\Json\JsonResource;

class ExportJobResource extends JsonResource
{
    public function toArray($request): array
    {
        /** @var ExportJob $job */
        $job = $this->resource;

        return [
            'id' => $job->id,
            'target_type' => $job->target_type,
            'target_id' => $job->target_id,
            'type' => $job->type,
            'status' => $job->status,
            'options' => $job->options ?? [],
            'error' => $job->status === ExportJob::STATUS_FAILED ? $job->error : null,
            'download_url' => $job->status === ExportJob::STATUS_COMPLETED
                ? '/export-jobs/' . $job->id . '/download'
                : null,
            'started_at' => $job->started_at,
            'finished_at' => $job->finished_at,
            'created_at' => $job->created_at,
            'updated_at' => $job->updated_at,
        ];
    }
}
