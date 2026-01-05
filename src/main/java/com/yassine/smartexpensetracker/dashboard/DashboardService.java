package com.yassine.smartexpensetracker.dashboard;

import com.yassine.smartexpensetracker.common.DateRange;
import com.yassine.smartexpensetracker.common.dto.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;

    public DashboardService(DashboardRepository dashboardRepository) {
        this.dashboardRepository = dashboardRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(UUID userId, LocalDate from, LocalDate to, int top) {
        DateRange range = DateRange.defaultLast12Months(from, to);

        DashboardRepository.SummaryView sv =
                dashboardRepository.summary(userId, range.from(), range.to());

        SummaryDto summary = new SummaryDto(sv.getTotal(), sv.getCount());

        List<TopCategoryDto> topCategories = dashboardRepository
                .topCategories(userId, range.from(), range.to(), PageRequest.of(0, top))
                .stream()
                .map(v -> new TopCategoryDto(v.getCategoryId(), v.getCategoryName(), v.getTotal()))
                .toList();

        List<MonthlySpendDto> monthly = dashboardRepository
                .monthlySpend(userId, range.from(), range.to())
                .stream()
                .map(v -> new MonthlySpendDto(v.getMonth(), v.getTotal()))
                .toList();

        return new DashboardResponse(summary, topCategories, monthly);
    }

    @Transactional(readOnly = true)
    public List<CategorySpendDto> spendByCategory(UUID userId, LocalDate from, LocalDate to) {
        DateRange range = DateRange.defaultLast12Months(from, to);

        return dashboardRepository
                .spendByCategory(userId, range.from(), range.to())
                .stream()
                .map(v -> new CategorySpendDto(v.getCategoryId(), v.getCategoryName(), v.getTotal(), v.getCount()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MerchantSpendDto> spendByMerchant(UUID userId, LocalDate from, LocalDate to, int limit) {
        DateRange range = DateRange.defaultLast12Months(from, to);

        return dashboardRepository
                .spendByMerchant(userId, range.from(), range.to(), PageRequest.of(0, limit))
                .stream()
                .map(v -> new MerchantSpendDto(v.getMerchant(), v.getTotal(), v.getCount()))
                .toList();
    }
}
