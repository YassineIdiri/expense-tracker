package com.yassine.smartexpensetracker.dashboard;

import com.yassine.smartexpensetracker.expense.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface DashboardRepository extends JpaRepository<Expense, UUID> {

    interface SummaryView {
        BigDecimal getTotal();
        long getCount();
    }

    @Query("""
        select
          coalesce(sum(e.amount), 0) as total,
          count(e.id) as count
        from Expense e
        where e.user.id = :userId
          and e.expenseDate between :from and :to
    """)
    SummaryView summary(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    interface TopCategoryView {
        UUID getCategoryId();
        String getCategoryName();
        BigDecimal getTotal();
    }

    @Query("""
        select
          c.id as categoryId,
          c.name as categoryName,
          coalesce(sum(e.amount), 0) as total
        from Expense e
        join e.category c
        where e.user.id = :userId
          and e.expenseDate between :from and :to
        group by c.id, c.name
        order by sum(e.amount) desc
    """)
    List<TopCategoryView> topCategories(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            org.springframework.data.domain.Pageable pageable
    );

    interface MonthlySpendView {
        String getMonth();      // "YYYY-MM"
        BigDecimal getTotal();
    }

    @Query(value = """
        select
          to_char(date_trunc('month', e.expense_date), 'YYYY-MM') as month,
          coalesce(sum(e.amount), 0) as total
        from expenses e
        where e.user_id = :userId
          and e.expense_date between :from and :to
        group by 1
        order by 1
    """, nativeQuery = true)
    List<MonthlySpendView> monthlySpend(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

















    interface CategorySpendView {
        UUID getCategoryId();
        String getCategoryName();
        BigDecimal getTotal();
        long getCount();
    }

    @Query("""
        select
          c.id as categoryId,
          c.name as categoryName,
          coalesce(sum(e.amount), 0) as total,
          count(e.id) as count
        from Expense e
        join e.category c
        where e.user.id = :userId
          and e.expenseDate between :from and :to
        group by c.id, c.name
        order by sum(e.amount) desc
    """)
    List<DashboardRepository.CategorySpendView> spendByCategory(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    interface MerchantSpendView {
        String getMerchant();
        BigDecimal getTotal();
        long getCount();
    }

    @Query("""
        select
          coalesce(e.merchant, 'Unknown') as merchant,
          coalesce(sum(e.amount), 0) as total,
          count(e.id) as count
        from Expense e
        where e.user.id = :userId
          and e.expenseDate between :from and :to
        group by coalesce(e.merchant, 'Unknown')
        order by sum(e.amount) desc
    """)
    List<DashboardRepository.MerchantSpendView> spendByMerchant(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            org.springframework.data.domain.Pageable pageable
    );
}
