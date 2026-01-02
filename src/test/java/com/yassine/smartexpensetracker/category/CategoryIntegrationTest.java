package com.yassine.smartexpensetracker.category;

import com.yassine.smartexpensetracker.auth.JwtService;
import com.yassine.smartexpensetracker.user.User;
import com.yassine.smartexpensetracker.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
class CategoryIntegrationTest {

    @Autowired RestTestClient client;
    @Autowired UserRepository userRepository;
    @Autowired CategoryRepository categoryRepository;
    @Autowired JwtService jwtService;

    private UUID userId;
    private String token;
    private UUID categoryId;

    // ----- Helpers ------------------------------------------------------------

    private RestTestClient.ResponseSpec getCategories() {
        return client.get()
                .uri("/api/v1/categories")
                .exchange();
    }

    private RestTestClient.ResponseSpec getCategoriesAuth() {
        return client.get()
                .uri("/api/v1/categories")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }



    private RestTestClient.ResponseSpec postCategoryAuth(String jsonBody) {
        return client.post()
                .uri("/api/v1/categories")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonBody)
                .exchange();
    }

    private RestTestClient.ResponseSpec putCategoryAuth(UUID categoryId, String jsonBody) {
        return client.put()
                .uri("/api/v1/categories/" + categoryId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonBody)
                .exchange();
    }

    private RestTestClient.ResponseSpec deleteCategoryAuth(UUID categoryId) {
        return client.delete()
                .uri("/api/v1/categories/" + categoryId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .exchange();
    }

    // ----- Setup --------------------------------------------------------------

    @BeforeEach
    void setUp() {
        // Clean (évite pollution entre tests)
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        User u = new User();
        u.setEmail("it@test.com");
        u.setPasswordHash("does-not-matter-here");
        userRepository.save(u);

        userId = u.getId();

        Category c = new Category();
        c.setUser(u);
        c.setName("Food");
        c.setColor("#FF0000");
        c.setIcon("🍔");
        c.setBudgetLimit(new BigDecimal("100.00"));
        categoryRepository.save(c);

        categoryId = c.getId();
    }

    // ----- Tests --------------------------------------------------------------

    @Test
    @DisplayName("GET /api/v1/categories -> 401 quand pas de header Authorization")
    void categories_shouldReturn401_whenNoAuthHeader() {
        getCategories()
                .expectStatus().isUnauthorized();
    }

    @Test
    @DisplayName("GET /api/v1/categories -> 401 quand token invalide")
    void categories_shouldReturn401_whenInvalidJwt() {
        client.get()
                .uri("/api/v1/categories")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + "this.is.not.a.jwt")
                .exchange()
                .expectStatus().isUnauthorized();
    }

    @Test
    @DisplayName("GET /api/v1/categories -> 200 + [] quand JWT valide et aucune catégorie")
    void categories_shouldReturn200_andEmptyList_whenNoCategories() {
        var spec = getCategoriesAuth();

        spec.expectStatus().isOk();
        spec.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON);

        spec.expectBody()
                .jsonPath("$").isArray()
                .jsonPath("$.length()").isEqualTo(0);
    }

    @Test
    @DisplayName("POST /api/v1/categories -> crée + trim + ensuite GET contient la catégorie")
    void categories_shouldCreate_thenListShouldContainIt() {
        String body = """
            {
              "name": "   Restaurant   ",
              "color": "  #FF0000  ",
              "icon": "  🍔  ",
              "budgetLimit": 100.00
            }
            """;

        var spec = postCategoryAuth(body);
        spec.expectStatus().isOk();

        spec.expectHeader().contentTypeCompatibleWith(HttpHeaders.AUTHORIZATION);
        spec.expectBody().jsonPath("$.name").isEqualTo("Restaurant");

        var specGet = getCategoriesAuth();
        spec.expectStatus().isOk();

        specGet.expectHeader().contentTypeCompatibleWith(HttpHeaders.AUTHORIZATION);
        specGet.expectBody().jsonPath("$").isArray();
        specGet.expectBody().jsonPath("$.lenght()").isEqualTo(2);

    }

    @Test
    @DisplayName("POST /api/v1/categories -> 400 si nom existe déjà (ignore case)")
    void categories_shouldReturn400_whenDuplicateNameIgnoringCase() {
        String body = """
            {
              "name": "   fOoD   ",
              "color": "#222222",
              "icon": "🍔",
              "budgetLimit": 50.00
            }
            """;

        postCategoryAuth(body)
                .expectStatus().isBadRequest(); // si IllegalArgumentException est mappée en 400
    }

    @Test
    @DisplayName("PUT /api/v1/categories/{id} -> 200 et met à jour les champs (trim)")
    void categories_shouldUpdate_whenOwnedByUser() {
        String body = """
            {
              "name": "  Restaurants  ",
              "color": "  #00FF00 ",
              "icon": "  🍽️ ",
              "budgetLimit": 200.00
            }
            """;

        var spec = putCategoryAuth(categoryId, body);

        spec.expectStatus().isOk();
        spec.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON);

        spec.expectBody()
                .jsonPath("$.id").isEqualTo(categoryId.toString())
                .jsonPath("$.name").isEqualTo("Restaurants")
                .jsonPath("$.color").isEqualTo("#00FF00")
                .jsonPath("$.icon").isEqualTo("🍽️")
                .jsonPath("$.budgetLimit").isEqualTo(200.00);
    }

    @Test
    @DisplayName("PUT /api/v1/categories/{id} -> 400 si catégorie n'existe pas pour ce user")
    void categories_shouldReturn400_whenUpdateNotFound() {
        String body = """
            {
              "name": "Test",
              "color": "#000",
              "icon": "x",
              "budgetLimit": 1.00
            }
            """;

        putCategoryAuth(UUID.randomUUID(), body)
                .expectStatus().isBadRequest(); // service -> IllegalArgumentException("Category not found")
    }

    @Test
    @DisplayName("DELETE /api/v1/categories/{id} -> supprime puis DB ne contient plus")
    void categories_shouldDelete_whenOwnedByUser() {
        var deleteSpec = deleteCategoryAuth(categoryId);

        // Selon ton controller: 204 ou 200
        deleteSpec.expectStatus().isOk();
        assertThat(categoryRepository.findById(categoryId)).isEmpty();
    }
}
