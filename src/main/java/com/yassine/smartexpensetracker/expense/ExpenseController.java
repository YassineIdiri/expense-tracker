package com.yassine.smartexpensetracker.expense;

import com.yassine.smartexpensetracker.auth.AuthUser;
import com.yassine.smartexpensetracker.expense.dto.ExpenseDtos.*;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.yassine.smartexpensetracker.common.PageResponse;
import com.yassine.smartexpensetracker.expense.dto.ExpenseDtos.ExpenseResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping
    public ExpenseResponse create(
            @AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody CreateExpenseRequest req
    ) {
        return expenseService.create(user.id(), req);
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateExpenseRequest req
    ) {
        return expenseService.update(user.id(), id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable UUID id
    ) {
        expenseService.delete(user.id(), id);
    }

    @GetMapping
    public PageResponse<ExpenseResponse> search(
            @AuthenticationPrincipal AuthUser user,

            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,

            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) BigDecimal min,
            @RequestParam(required = false) BigDecimal max,
            @RequestParam(required = false) String q,

            @ParameterObject Pageable pageable
    ) {
        return expenseService.search(user.id(), from, to, categoryId, min, max, q, pageable);
    }

    @GetMapping("/summary")
    public ExpenseSummaryResponse summary(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return expenseService.summary(user.id(), from, to);
    }

}
