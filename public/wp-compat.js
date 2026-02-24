(() => {
  function hydrateLazyImages(root) {
    const lazyImgs = root.querySelectorAll("img[data-src]:not([src])");
    lazyImgs.forEach((img) => {
      const src = img.getAttribute("data-src");
      if (src) img.setAttribute("src", src);
    });
  }

  function setActiveDot(pagination, index) {
    if (!pagination) return;
    const dots = pagination.querySelectorAll("button");
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", i === index ? "true" : "false");
      dot.classList.toggle("is-active", i === index);
    });
  }

  function initCarousel(wrapper) {
    const track = wrapper.querySelector(".elementor-image-carousel.swiper-wrapper");
    const slides = track ? Array.from(track.querySelectorAll(".swiper-slide")) : [];
    if (!track || slides.length === 0) return;

    hydrateLazyImages(wrapper);

    wrapper.classList.add("wp-carousel-ready");
    track.classList.add("wp-carousel-track");
    slides.forEach((slide) => slide.classList.add("wp-carousel-slide"));

    const prev = wrapper.querySelector(".elementor-swiper-button-prev");
    const next = wrapper.querySelector(".elementor-swiper-button-next");
    const pagination = wrapper.querySelector(".swiper-pagination");

    let index = 0;

    if (pagination) {
      pagination.innerHTML = "";
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "wp-carousel-dot";
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.addEventListener("click", () => {
          index = i;
          render();
        });
        pagination.appendChild(dot);
      });
    }

    const render = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      setActiveDot(pagination, index);
    };

    const goPrev = () => {
      index = (index - 1 + slides.length) % slides.length;
      render();
    };

    const goNext = () => {
      index = (index + 1) % slides.length;
      render();
    };

    prev?.addEventListener("click", goPrev);
    next?.addEventListener("click", goNext);

    [prev, next].forEach((btn) => {
      btn?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          btn.click();
        }
      });
    });

    render();
  }

  function init() {
    const wrappers = document.querySelectorAll(".elementor-image-carousel-wrapper.swiper");
    wrappers.forEach((wrapper) => initCarousel(wrapper));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
