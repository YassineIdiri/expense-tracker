package com.yassine.smartexpensetracker.expense;

import com.yassine.smartexpensetracker.category.Category;
import com.yassine.smartexpensetracker.category.CategoryRepository;
import com.yassine.smartexpensetracker.common.PageResponse;
import com.yassine.smartexpensetracker.expense.dto.ExpenseDtos.*;
import com.yassine.smartexpensetracker.user.User;
import com.yassine.smartexpensetracker.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public ExpenseService(ExpenseRepository expenseRepository,
                          CategoryRepository categoryRepository,
                          UserRepository userRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> list(UUID userId, LocalDate from, LocalDate to) {
        return expenseRepository
                .findByUserIdAndExpenseDateBetweenOrderByExpenseDateDesc(
                        userId, from, to
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ExpenseResponse create(UUID userId, CreateExpenseRequest req) {
        Category category = categoryRepository
                .findByIdAndUserId(req.categoryId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        Expense e = new Expense();
        e.setUser(user);
        e.setCategory(category);
        e.setAmount(req.amount());
        e.setExpenseDate(req.expenseDate());
        e.setMerchant(req.merchant());
        e.setNote(req.note());

        expenseRepository.save(e);
        return toResponse(e);
    }

    @Transactional
    public ExpenseResponse update(UUID userId, UUID expenseId, UpdateExpenseRequest req) {
        Expense e = expenseRepository.findById(expenseId)
                .filter(x -> x.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Expense not found"));

        Category category = categoryRepository
                .findByIdAndUserId(req.categoryId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        e.setCategory(category);
        e.setAmount(req.amount());
        e.setExpenseDate(req.expenseDate());
        e.setMerchant(req.merchant());
        e.setNote(req.note());

        return toResponse(e);
    }

    @Transactional
    public void delete(UUID userId, UUID expenseId) {
        Expense e = expenseRepository.findById(expenseId)
                .filter(x -> x.getUser().getId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Expense not found"));

        expenseRepository.delete(e);
    }

    private ExpenseResponse toResponse(Expense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getAmount(),
                e.getCurrency(),
                e.getExpenseDate(),
                e.getMerchant(),
                e.getNote(),
                e.getCategory().getId(),
                e.getCategory().getName()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<ExpenseResponse> search(
            UUID userId,
            LocalDate from,
            LocalDate to,
            UUID categoryId,
            BigDecimal min,
            BigDecimal max,
            String q,
            Pageable pageable
    ) {

        String qPattern = (q == null || q.isBlank())
                ? null
                : "%" + q.trim().toLowerCase() + "%";


        Page<ExpenseResponse> page = expenseRepository
                .search(userId, from, to, categoryId, min, max, qPattern, pageable)
                .map(this::toResponse);

        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public ExpenseSummaryResponse summary(UUID userId, LocalDate from, LocalDate to) {
        var view = expenseRepository.summary(userId, from, to);
        return new ExpenseSummaryResponse(view.getTotalAmount(), view.getTotalCount());
    }

}