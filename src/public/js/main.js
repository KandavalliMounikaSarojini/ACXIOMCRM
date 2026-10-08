/**
 * AcxiomCRM Client-Side Logic: Form Validation, Interactive Modals, and Toasts
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Client-Side Form Validation for all CRM Forms
  const forms = document.querySelectorAll('form[data-validate="true"]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      let hasError = false;

      // Clear existing inline errors
      form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
      form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

      // 1. Required Fields
      form.querySelectorAll('[required]').forEach(input => {
        if (!input.value || !input.value.trim()) {
          showFieldError(input, `${getFieldLabel(input)} is required.`);
          hasError = true;
        }
      });

      // 2. Email Validation
      const emailInputs = form.querySelectorAll('input[type="email"], input[name="Email"]');
      emailInputs.forEach(input => {
        if (input.value && input.value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.value.trim())) {
            showFieldError(input, 'Enter a valid email address.');
            hasError = true;
          }
        }
      });

      // 3. Phone Validation (10-15 digits)
      const phoneInputs = form.querySelectorAll('input[name="Phone"]');
      phoneInputs.forEach(input => {
        if (input.value && input.value.trim()) {
          const cleaned = input.value.replace(/[\s\-\(\)\+]/g, '');
          if (!/^\d{10,15}$/.test(cleaned)) {
            showFieldError(input, 'Enter a valid phone number (10 to 15 digits).');
            hasError = true;
          }
        }
      });

      // 4. Opportunity Amount > 0
      const amountInput = form.querySelector('input[name="Amount"]');
      if (amountInput && amountInput.value !== '') {
        const val = parseFloat(amountInput.value);
        if (isNaN(val) || val <= 0) {
          showFieldError(amountInput, 'Opportunity Amount must be greater than 0.');
          hasError = true;
        }
      }

      // 5. Probability (0 - 100)
      const probInput = form.querySelector('input[name="Probability"]');
      if (probInput && probInput.value !== '') {
        const val = parseInt(probInput.value, 10);
        if (isNaN(val) || val < 0 || val > 100) {
          showFieldError(probInput, 'Probability must be between 0 and 100.');
          hasError = true;
        }
      }

      // 6. Expected Close Date (Cannot be in past for active opportunities)
      const closeDateInput = form.querySelector('input[name="ExpectedCloseDate"]');
      if (closeDateInput && closeDateInput.value) {
        const stageSelect = form.querySelector('select[name="Stage"]');
        const stage = stageSelect ? stageSelect.value : 'Qualification';
        if (!['Won', 'Lost'].includes(stage)) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const target = new Date(closeDateInput.value);
          target.setHours(0, 0, 0, 0);

          if (target < today) {
            showFieldError(closeDateInput, 'Expected Close Date cannot be in the past.');
            hasError = true;
          }
        }
      }

      // 7. Follow-Up Date (Cannot be earlier than today for planned/new activities)
      const followUpDateInput = form.querySelector('input[name="FollowUpDate"]');
      if (followUpDateInput && followUpDateInput.value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(followUpDateInput.value);
        target.setHours(0, 0, 0, 0);

        if (target < today) {
          showFieldError(followUpDateInput, 'Follow-up date cannot be earlier than today.');
          hasError = true;
        }
      }

      if (hasError) {
        e.preventDefault();
        e.stopPropagation();
        showToast('Please correct the highlighted validation errors.', 'error');
      }
    });
  });

  function showFieldError(input, message) {
    input.classList.add('is-invalid');
    const err = document.createElement('span');
    err.className = 'field-error-msg';
    err.innerText = message;
    input.parentNode.appendChild(err);
  }

  function getFieldLabel(input) {
    const label = input.closest('.mb-3')?.querySelector('.form-label');
    return label ? label.innerText.replace('*', '').trim() : (input.name || 'Field');
  }

  // 2. Global Toast Alert Utility
  window.showToast = function(message, type = 'info') {
    let container = document.querySelector('.crm-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'crm-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'crm-toast';
    
    let icon = 'bi-info-circle';
    if (type === 'success') icon = 'bi-check-circle-fill text-success';
    if (type === 'error') icon = 'bi-exclamation-triangle-fill text-danger';

    toast.innerHTML = `
      <i class="bi ${icon} fs-5"></i>
      <div class="flex-grow-1 text-sm">${message}</div>
      <button type="button" class="btn-close btn-close-white btn-sm ms-2" onclick="this.parentElement.remove()"></button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  };

  // 3. Confirm Delete Dialogs
  document.querySelectorAll('form.delete-confirm-form').forEach(f => {
    f.addEventListener('submit', (e) => {
      const msg = f.getAttribute('data-confirm') || 'Are you sure you want to permanently delete this record? This action cannot be undone.';
      if (!confirm(msg)) {
        e.preventDefault();
      }
    });
  });

  // 4. Quick stage change from table/kanban
  window.updateOpportunityStage = async function(oppId, stage) {
    try {
      const res = await fetch(`/opportunities/${oppId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Opportunity stage updated to "${stage}".`, 'success');
        setTimeout(() => window.location.reload(), 600);
      } else {
        showToast(data.error || 'Failed to update stage.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating opportunity stage.', 'error');
    }
  };

  // 5. Quick complete follow-up
  window.completeFollowUp = async function(followUpId) {
    try {
      const res = await fetch(`/followups/${followUpId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Follow-up marked as Completed.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } else {
        showToast(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating follow-up.', 'error');
    }
  };
});
