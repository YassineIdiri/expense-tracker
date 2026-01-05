package com.yassine.smartexpensetracker.dashboard;

import com.yassine.smartexpensetracker.auth.AuthUser;
import com.yassine.smartexpensetracker.common.dto.CategorySpendDto;
import com.yassine.smartexpensetracker.common.dto.DashboardResponse;
import com.yassine.smartexpensetracker.common.dto.MerchantSpendDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse dashboard(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "5") int top
    ) {
        // Robustesse: si jamais un jour un endpoint est mal configuré en permitAll,
        // tu évites NPE et tu renvoies une erreur claire.
        if (user == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Unauthenticated"
            );
        }

        UUID userId = user.id();
        return dashboardService.getDashboard(userId, from, to, top);
    }

    @GetMapping("/categories")
    public List<CategorySpendDto> byCategory(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        UUID userId = user.id();
        return dashboardService.spendByCategory(userId, from, to);
    }

    @GetMapping("/merchants")
    public List<MerchantSpendDto> byMerchant(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit
    ) {
        UUID userId = user.id();
        return dashboardService.spendByMerchant(userId, from, to, limit);
    }
}
