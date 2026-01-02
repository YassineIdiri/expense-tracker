package com.yassine.smartexpensetracker.category;

import com.yassine.smartexpensetracker.category.dto.CategoryDtos.*;
import com.yassine.smartexpensetracker.user.User;
import com.yassine.smartexpensetracker.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock CategoryRepository categoryRepository;
    @Mock UserRepository userRepository;

    @InjectMocks CategoryService categoryService;

    @Test
    void list_shouldReturnMappedResponses_sortedByRepo() {
        UUID userId = UUID.randomUUID();

        // repo renvoie déjà trié par name ASC (c'est le job de la query)
        Category c1 = new Category();
        c1.setName("Food");
        c1.setColor("#ff0000");
        c1.setIcon("🍔");
        c1.setBudgetLimit(new BigDecimal("100.00"));

        Category c2 = new Category();
        c2.setName("Rent");
        c2.setColor("#00ff00");
        c2.setIcon("🏠");
        c2.setBudgetLimit(new BigDecimal("800.00"));

        when(categoryRepository.findAllByUserIdOrderByNameAsc(userId))
                .thenReturn(List.of(c1, c2));

        List<CategoryResponse> res = categoryService.list(userId);

        assertThat(res).hasSize(2);
        assertThat(res.get(0).name()).isEqualTo("Food");
        assertThat(res.get(1).name()).isEqualTo("Rent");

        verify(categoryRepository).findAllByUserIdOrderByNameAsc(userId);
        verifyNoMoreInteractions(categoryRepository, userRepository);
    }

    @Test
    void create_shouldTrimNameAndFields_andSave_andReturnResponse() {
        UUID userId = UUID.randomUUID();

        CreateCategoryRequest req = new CreateCategoryRequest(
                "  Food  ",
                "  #ff0000  ",
                "  🍔  ",
                new BigDecimal("100.00")
        );

        when(categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Food"))
                .thenReturn(false);

        User user = new User();
        user.setEmail("it@test.com");
        user.setPasswordHash("x");
        // pas besoin d'id réel ici, on vérifie juste que user est mis sur la Category
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);

        CategoryResponse res = categoryService.create(userId, req);

        // vérifie save() avec entity remplie correctement
        verify(categoryRepository).save(captor.capture());
        Category saved = captor.getValue();

        assertThat(saved.getUser()).isSameAs(user);
        assertThat(saved.getName()).isEqualTo("Food");
        assertThat(saved.getColor()).isEqualTo("#ff0000");
        assertThat(saved.getIcon()).isEqualTo("🍔");
        assertThat(saved.getBudgetLimit()).isEqualByComparingTo("100.00");

        // réponse mappée (id peut être null en unit test car pas de JPA)
        assertThat(res.name()).isEqualTo("Food");
        assertThat(res.color()).isEqualTo("#ff0000");
        assertThat(res.icon()).isEqualTo("🍔");
        assertThat(res.budgetLimit()).isEqualByComparingTo("100.00");

        verify(categoryRepository).existsByUserIdAndNameIgnoreCase(userId, "Food");
        verify(userRepository).findById(userId);
        verifyNoMoreInteractions(categoryRepository, userRepository);
    }

    @Test
    void create_shouldThrow_whenNameAlreadyExists() {
        UUID userId = UUID.randomUUID();

        CreateCategoryRequest req = new CreateCategoryRequest(
                " Food ",
                "#fff",
                "🍔",
                null
        );

        when(categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Food"))
                .thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(userId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category name already exists");

        // stop dès le check => pas d'appel à user repo ni save
        verify(categoryRepository).existsByUserIdAndNameIgnoreCase(userId, "Food");
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(userRepository);
    }

    @Test
    void create_shouldThrow_whenUserNotFound() {
        UUID userId = UUID.randomUUID();

        CreateCategoryRequest req = new CreateCategoryRequest(
                "Food",
                "#fff",
                "🍔",
                null
        );

        when(categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Food"))
                .thenReturn(false);

        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.create(userId, req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Authenticated user not found");

        verify(categoryRepository).existsByUserIdAndNameIgnoreCase(userId, "Food");
        verify(userRepository).findById(userId);
        verifyNoMoreInteractions(categoryRepository, userRepository);
    }

    @Test
    void update_shouldUpdateFields_whenNameChangedAndNoConflict() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Category existing = new Category();
        existing.setName("Food");
        existing.setColor("#old");
        existing.setIcon("old");
        existing.setBudgetLimit(new BigDecimal("50.00"));

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.of(existing));

        // name change => check conflict
        when(categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Groceries"))
                .thenReturn(false);

        UpdateCategoryRequest req = new UpdateCategoryRequest(
                "  Groceries  ",
                "  #new  ",
                "  🛒  ",
                new BigDecimal("120.00")
        );

        CategoryResponse res = categoryService.update(userId, categoryId, req);

        // JPA: pas besoin de save() explicite, l'entité est managed -> ici on vérifie juste l'état
        assertThat(existing.getName()).isEqualTo("Groceries");
        assertThat(existing.getColor()).isEqualTo("#new");
        assertThat(existing.getIcon()).isEqualTo("🛒");
        assertThat(existing.getBudgetLimit()).isEqualByComparingTo("120.00");

        assertThat(res.name()).isEqualTo("Groceries");
        assertThat(res.icon()).isEqualTo("🛒");

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verify(categoryRepository).existsByUserIdAndNameIgnoreCase(userId, "Groceries");
        verifyNoMoreInteractions(categoryRepository, userRepository);
    }

    @Test
    void update_shouldNotCheckDuplicate_whenNameSameIgnoringCase() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Category existing = new Category();
        existing.setName("Food");

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.of(existing));

        // on passe "food" => equalsIgnoreCase => pas besoin de existsBy...
        UpdateCategoryRequest req = new UpdateCategoryRequest(
                "  food  ",
                " #c ",
                " 🍔 ",
                null
        );

        categoryService.update(userId, categoryId, req);

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verify(categoryRepository, never()).existsByUserIdAndNameIgnoreCase(any(), any());
        verifyNoMoreInteractions(categoryRepository, userRepository);
    }

    @Test
    void update_shouldThrow_whenCategoryNotFound() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.empty());

        UpdateCategoryRequest req = new UpdateCategoryRequest("Food", "#", "🍔", null);

        assertThatThrownBy(() -> categoryService.update(userId, categoryId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category not found");

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(userRepository);
    }

    @Test
    void update_shouldThrow_whenNewNameConflicts() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Category existing = new Category();
        existing.setName("Food");

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.of(existing));

        when(categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Rent"))
                .thenReturn(true);

        UpdateCategoryRequest req = new UpdateCategoryRequest(" Rent ", "#", "🏠", null);

        assertThatThrownBy(() -> categoryService.update(userId, categoryId, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category name already exists");

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verify(categoryRepository).existsByUserIdAndNameIgnoreCase(userId, "Rent");
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(userRepository);
    }

    @Test
    void delete_shouldDelete_whenFound() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        Category existing = new Category();
        existing.setName("Food");

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.of(existing));

        categoryService.delete(userId, categoryId);

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verify(categoryRepository).delete(existing);
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(userRepository);
    }

    @Test
    void delete_shouldThrow_whenNotFound() {
        UUID userId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        when(categoryRepository.findByIdAndUserId(categoryId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.delete(userId, categoryId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Category not found");

        verify(categoryRepository).findByIdAndUserId(categoryId, userId);
        verifyNoMoreInteractions(categoryRepository);
        verifyNoInteractions(userRepository);
    }
}
