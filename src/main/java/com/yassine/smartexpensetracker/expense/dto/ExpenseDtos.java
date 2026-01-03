package com.yassine.smartexpensetracker.expense.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class ExpenseDtos {

    public record ExpenseResponse(
            UUID id,
            BigDecimal amount,
            String currency,
            LocalDate expenseDate,
            String merchant,
            String note,
            UUID categoryId,
            String categoryName
    ) {}

    public record CreateExpenseRequest(
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotNull LocalDate expenseDate,
            @NotNull UUID categoryId,
            @Size(max = 120) String merchant,
            String note
    ) {}

    public record UpdateExpenseRequest(
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotNull LocalDate expenseDate,
            @NotNull UUID categoryId,
            @Size(max = 120) String merchant,
            String note
    ) {}

    public record ExpenseSummaryResponse(
            BigDecimal totalAmount,
            long totalCount
    ) {}

    public interface ExpenseSummaryView {
        BigDecimal getTotalAmount();
        long getTotalCount();
    }

}
