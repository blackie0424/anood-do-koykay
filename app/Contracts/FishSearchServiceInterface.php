<?php

namespace App\Contracts;

interface FishSearchServiceInterface
{
    public function search(array $filters);

    public function getSearchOptions();

    public function buildSearchQuery(array $filters);

    public function getSearchStats(array $filters);

    public function getCompactFishById(int $id): ?array;

    public function paginate(array $filters): array;

    public function getLatestAt(): ?int;
}
