package com.yassine.smartexpensetracker.common.dto;

import java.util.List;

public record DashboardResponse(
        SummaryDto summary,
        List<TopCategoryDto> topCategories,
        List<MonthlySpendDto> monthlySeries
) {}
