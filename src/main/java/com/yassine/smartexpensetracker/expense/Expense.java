package com.yassine.smartexpensetracker.expense;

import com.yassine.smartexpensetracker.category.Category;
import com.yassine.smartexpensetracker.user.User;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 8)
    private String currency = "EUR";

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(length = 120)
    private String merchant;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
