package com.yassine.smartexpensetracker.expense;

import com.yassine.smartexpensetracker.expense.dto.ExpenseDtos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    List<Expense> findByUserIdAndExpenseDateBetweenOrderByExpenseDateDesc(
            UUID userId,
            LocalDate from,
            LocalDate to
    );

    @Query("""
    select e from Expense e
    where e.user.id = :userId
      and e.expenseDate between :from and :to
      and (:categoryId is null or e.category.id = :categoryId)
      and (:min is null or e.amount >= :min)
      and (:max is null or e.amount <= :max)
      and (
        :qPattern is null
        or lower(coalesce(e.merchant, '')) like :qPattern
        or lower(coalesce(e.note, '')) like :qPattern
      )
    """)
        Page<Expense> search(
                @Param("userId") UUID userId,
                @Param("from") LocalDate from,
                @Param("to") LocalDate to,
                @Param("categoryId") UUID categoryId,
                @Param("min") BigDecimal min,
                @Param("max") BigDecimal max,
                @Param("qPattern") String qPattern,
                Pageable pageable
        );

    @Query("""
    select
      coalesce(sum(e.amount), 0) as totalAmount,
      count(e.id) as totalCount
    from Expense e
    where e.user.id = :userId
      and e.expenseDate between :from and :to
    """)
        ExpenseDtos.ExpenseSummaryView summary(
                @Param("userId") UUID userId,
                @Param("from") LocalDate from,
                @Param("to") LocalDate to
        );

}
